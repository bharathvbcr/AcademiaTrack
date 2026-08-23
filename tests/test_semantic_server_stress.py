"""Adversarial tests for the semantic sidecar's HTTP surface.

The sidecar has no authentication: anything that can reach the port, including
any page served from a CORS-allowed origin, can drive it. Input validation is
therefore the whole of the trust boundary, and each test below corresponds to a
request that previously crossed it.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from starlette.testclient import TestClient

import semantic_layer.server as srv
from semantic_layer.server import create_app


@pytest.fixture()
def client() -> TestClient:
    # raise_server_exceptions=False so an unhandled error surfaces as the 500 a
    # real client would see, rather than aborting the test.
    return TestClient(create_app(), raise_server_exceptions=False)


@pytest.fixture()
def enabled():
    with patch.object(srv, "_is_enabled", return_value=True):
        yield


def _pipeline_stub(recorded: list | None = None) -> MagicMock:
    fake = MagicMock()
    if recorded is not None:
        fake.record_feedback = lambda s, a: recorded.append((s, a))
    return fake


# ------------------------------------------------------------ request shape


class TestRequestValidation:
    def test_non_object_message_is_a_client_error_not_a_crash(self, client, enabled) -> None:
        r = client.post("/v1/chat", json={"messages": ["a bare string"], "model": "m"})
        assert r.status_code == 400
        assert "message" in r.json()["error"]

    @pytest.mark.parametrize(
        "messages",
        [[1], [None], [["nested"]], [{"role": "user"}, 42]],
        ids=["int", "null", "list", "mixed"],
    )
    def test_every_non_mapping_element_is_rejected(self, client, enabled, messages) -> None:
        r = client.post("/v1/chat", json={"messages": messages, "model": "m"})
        assert r.status_code == 400

    def test_missing_messages_is_rejected(self, client, enabled) -> None:
        assert client.post("/v1/chat", json={"model": "m"}).status_code == 400

    def test_empty_messages_is_rejected(self, client, enabled) -> None:
        assert client.post("/v1/chat", json={"messages": [], "model": "m"}).status_code == 400

    def test_non_object_body_is_rejected(self, client, enabled) -> None:
        r = client.post(
            "/v1/chat", content=b"[1,2,3]", headers={"content-type": "application/json"}
        )
        assert r.status_code == 400

    def test_malformed_json_is_rejected(self, client, enabled) -> None:
        r = client.post(
            "/v1/chat", content=b"{not json", headers={"content-type": "application/json"}
        )
        assert r.status_code == 400

    def test_oversized_body_is_refused(self, client, enabled) -> None:
        """request.json() buffers everything; without a cap this is a memory DoS."""
        payload = {"messages": [{"role": "user", "content": "x" * (5 * 1024 * 1024)}]}
        assert client.post("/v1/chat", json=payload).status_code == 413

    def test_lying_content_length_is_still_capped(self, client, enabled) -> None:
        """The declared length is a hint; the stream itself must be bounded."""
        from semantic_layer.config import CONFIG

        body = b'{"messages":[{"role":"user","content":"' + b"x" * (
            CONFIG.max_request_bytes + 1024
        ) + b'"}]}'
        r = client.post(
            "/v1/chat", content=body, headers={"content-type": "application/json"}
        )
        assert r.status_code == 413


# ------------------------------------------------------- tuner input bounds


class TestFeedbackBounds:
    @pytest.mark.parametrize(
        "value", ["NaN", "Infinity", "-Infinity", 5.0, -3.0, 1e308],
        ids=["nan", "inf", "-inf", "above1", "below-1", "huge"],
    )
    def test_impossible_similarity_never_reaches_the_tuner(
        self, client, enabled, value
    ) -> None:
        """The tuner moves the live cache threshold off this window.

        NaN compares False against every candidate tau, so it silently skews the
        hit and false-positive rates the threshold is fitted on. Values outside
        [-1, 1] are not cosine similarities at all.
        """
        recorded: list = []
        with patch.object(srv, "_get_pipeline", new=AsyncMock(return_value=_pipeline_stub(recorded))):
            r = client.post(
                "/v1/feedback",
                content=json.dumps({"similarity": value, "accepted": True}),
                headers={"content-type": "application/json"},
            )
        assert r.status_code == 400
        assert recorded == [], f"{value!r} reached record_feedback"

    @pytest.mark.parametrize("value", [-1.0, 0.0, 0.5, 0.873, 1.0])
    def test_legitimate_similarity_is_accepted(self, client, enabled, value) -> None:
        recorded: list = []
        with patch.object(srv, "_get_pipeline", new=AsyncMock(return_value=_pipeline_stub(recorded))):
            r = client.post(
                "/v1/feedback",
                json={"similarity": value, "accepted": True},
            )
        assert r.status_code == 200
        assert recorded == [(value, True)]

    def test_non_numeric_similarity_is_rejected(self, client, enabled) -> None:
        with patch.object(srv, "_get_pipeline", new=AsyncMock(return_value=_pipeline_stub([]))):
            r = client.post("/v1/feedback", json={"similarity": "high", "accepted": True})
        assert r.status_code == 400


# ---------------------------------------------------------------- SSRF gate


class TestOllamaHostAllowlist:
    @pytest.mark.parametrize(
        "url",
        [
            "http://evil.localhost/",
            "http://169.254.169.254/latest/meta-data/",
            "http://metadata.google.internal/",
            "file:///etc/passwd",
            "gopher://127.0.0.1:11434/",
            "http://127.0.0.1.evil.com/",
            "http://user@evil.com/",
            "",
            "not a url",
        ],
    )
    def test_disallowed_targets_are_refused(self, url: str) -> None:
        assert srv._validate_ollama_base(url) is None

    @pytest.mark.parametrize(
        "url", ["http://127.0.0.1:11434", "http://localhost:11434", "http://[::1]:11434"]
    )
    def test_configured_hosts_are_allowed(self, url: str) -> None:
        assert srv._validate_ollama_base(url) == url

    def test_chat_rejects_a_disallowed_backend(self, client, enabled) -> None:
        r = client.post(
            "/v1/chat",
            json={
                "messages": [{"role": "user", "content": "hi"}],
                "ollama_base_url": "http://169.254.169.254/",
            },
        )
        assert r.status_code == 400


# ------------------------------------------------------------ error hygiene


class TestErrorHygiene:
    def test_internal_failures_do_not_echo_exception_text(self, client, enabled) -> None:
        """Exception strings carry paths and internal state; log them, don't serve them."""
        boom = AsyncMock(side_effect=RuntimeError("secret internal detail /Users/x/token"))
        with patch.object(srv, "_get_pipeline", new=boom):
            r = client.post(
                "/v1/chat", json={"messages": [{"role": "user", "content": "hi"}]}
            )
        assert r.status_code == 500
        assert "secret internal detail" not in r.text
        assert "/Users/" not in r.text

    def test_disabled_layer_reports_503_not_a_crash(self, client) -> None:
        with patch.object(srv, "_is_enabled", return_value=False):
            for path in ("/v1/chat", "/v1/chat/stream", "/v1/feedback"):
                assert client.post(path, json={"messages": []}).status_code == 503

    def test_health_is_always_answerable(self, client) -> None:
        r = client.get("/health")
        assert r.status_code == 200
        assert set(r.json()) == {"enabled", "ready"}
