/**
 * The sidecar's per-session token, end to end through the client.
 *
 * The Rust launcher mints a token per spawn, hands it to the Python process,
 * and returns it with the sidecar status. These tests pin the two halves the
 * TypeScript side owns: that every status path keeps the stored token in step
 * with the process actually running, and that requests carry it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AISettings } from '../types';

const invoke = vi.hoisted(() => vi.fn());

vi.mock('@tauri-apps/api/core', () => ({ invoke }));
vi.mock('../../../lib/desktopBridge', () => ({ isTauriRuntime: vi.fn(() => true) }));

const settings: AISettings = {
    enabled: true,
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'llama3.1',
    temperature: 0.5,
    semanticEnabled: true,
};

const rawStatus = (overrides: Record<string, unknown> = {}) => ({
    phase: 'running',
    port: 8765,
    spawned_by_app: true,
    pid: 4242,
    error: null,
    health_enabled: true,
    health_ready: true,
    ...overrides,
});

describe('sidecar auth token', () => {
    beforeEach(async () => {
        const bridge = await import('../semanticBridge');
        bridge.setSemanticAuthToken(null);
        invoke.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('stores the token returned when the app starts the sidecar', async () => {
        const { invokeStartSemanticSidecar } = await import('../semanticSidecar');
        const { getSemanticAuthToken } = await import('../semanticBridge');

        invoke.mockResolvedValue(rawStatus({ auth_token: 'deadbeef' }));
        const status = await invokeStartSemanticSidecar(settings);

        expect(status?.authToken).toBe('deadbeef');
        expect(getSemanticAuthToken()).toBe('deadbeef');
    });

    it('clears the token when the sidecar reports none', async () => {
        const { invokeStartSemanticSidecar, invokeGetSemanticSidecarStatus } =
            await import('../semanticSidecar');
        const { getSemanticAuthToken } = await import('../semanticBridge');

        invoke.mockResolvedValue(rawStatus({ auth_token: 'deadbeef' }));
        await invokeStartSemanticSidecar(settings);
        expect(getSemanticAuthToken()).toBe('deadbeef');

        // A stop, or an external sidecar, reports no token of ours.
        invoke.mockResolvedValue(rawStatus({ spawned_by_app: false, auth_token: null }));
        await invokeGetSemanticSidecarStatus(settings);

        expect(getSemanticAuthToken()).toBeNull();
    });

    it('replaces the token when the sidecar is restarted', async () => {
        const { invokeStartSemanticSidecar } = await import('../semanticSidecar');
        const { getSemanticAuthToken } = await import('../semanticBridge');

        invoke.mockResolvedValue(rawStatus({ auth_token: 'first' }));
        await invokeStartSemanticSidecar(settings);
        invoke.mockResolvedValue(rawStatus({ auth_token: 'second' }));
        await invokeStartSemanticSidecar(settings);

        expect(getSemanticAuthToken()).toBe('second');
    });

    it('sends the token on chat requests once one is held', async () => {
        const { chatViaSemanticLayer, setSemanticAuthToken } = await import('../semanticBridge');

        setSemanticAuthToken('s3cret');
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ response: 'hi', cache_hit: false }),
        });
        vi.stubGlobal('fetch', fetchMock);

        await chatViaSemanticLayer(settings, [{ role: 'user', content: 'hi' }]);

        const headers = fetchMock.mock.calls[0][1].headers;
        expect(headers['X-Semantic-Token']).toBe('s3cret');
        expect(headers['Content-Type']).toBe('application/json');
    });

    it('omits the header entirely when no token is held', async () => {
        const { chatViaSemanticLayer, setSemanticAuthToken } = await import('../semanticBridge');

        setSemanticAuthToken(null);
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ response: 'hi', cache_hit: false }),
        });
        vi.stubGlobal('fetch', fetchMock);

        await chatViaSemanticLayer(settings, [{ role: 'user', content: 'hi' }]);

        const headers = fetchMock.mock.calls[0][1].headers;
        expect(headers).not.toHaveProperty('X-Semantic-Token');
    });

    it('reports a 401 as an actionable message, not a transport failure', async () => {
        const { chatViaSemanticLayer, setSemanticAuthToken } = await import('../semanticBridge');

        setSemanticAuthToken('stale');
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                text: async () => '{"error":"unauthorized"}',
            }),
        );

        await expect(
            chatViaSemanticLayer(settings, [{ role: 'user', content: 'hi' }]),
        ).rejects.toThrow(/session token/i);
    });
});
