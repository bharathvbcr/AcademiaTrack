"""Adapters for AcademiaTrack chat messages and LLM backends."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, AsyncIterator

from semantic_layer.compressor.rag_compressor import RagChunk


@dataclass(frozen=True)
class ChatTurn:
    role: str
    content: str


@dataclass(frozen=True)
class SemanticChatRequest:
    prompt: str
    rag_chunks: list[RagChunk]
    model_version: str


def messages_to_semantic_request(
    messages: list[dict[str, Any]],
    *,
    model_version: str,
) -> SemanticChatRequest:
    """
    Split chat messages into a primary prompt and RAG chunks for compression.

    - Last user turn becomes the prompt.
    - System content and earlier turns become retrievable chunks.
    """
    turns = [
        ChatTurn(role=str(m.get("role", "user")), content=str(m.get("content", "")))
        for m in messages
        if str(m.get("content", "")).strip()
    ]
    if not turns:
        return SemanticChatRequest(prompt="", rag_chunks=[], model_version=model_version)

    last_user_idx = None
    for idx in range(len(turns) - 1, -1, -1):
        if turns[idx].role == "user":
            last_user_idx = idx
            break

    if last_user_idx is None:
        combined = "\n\n".join(f"{t.role}: {t.content}" for t in turns)
        return SemanticChatRequest(
            prompt=combined,
            rag_chunks=[],
            model_version=model_version,
        )

    prompt = turns[last_user_idx].content
    chunks: list[RagChunk] = []
    for idx, turn in enumerate(turns):
        if idx == last_user_idx:
            continue
        chunks.append(
            RagChunk(
                chunk_id=f"turn-{idx}",
                text=turn.content,
                source=turn.role,
            )
        )
    return SemanticChatRequest(
        prompt=prompt,
        rag_chunks=chunks,
        model_version=model_version,
    )


class BoundModelBackend:
    """Forces a single user-selected model regardless of router tier."""

    def __init__(self, inner: Any, model_id: str) -> None:
        self._inner = inner
        self._model_id = model_id

    async def generate(self, model_id: str, prompt: str) -> str:
        del model_id
        return await self._inner.generate(self._model_id, prompt)

    async def generate_stream(self, model_id: str, prompt: str) -> AsyncIterator[str]:
        del model_id
        async for token in self._inner.generate_stream(self._model_id, prompt):
            yield token
