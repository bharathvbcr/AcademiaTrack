import { afterEach, describe, expect, it, vi } from 'vitest';
import { AISettings } from '../types';

const invoke = vi.hoisted(() => vi.fn());

vi.mock('@tauri-apps/api/core', () => ({
    invoke,
}));

vi.mock('../../../lib/desktopBridge', () => ({
    isTauriRuntime: vi.fn(() => true),
}));

const baseSettings: AISettings = {
    enabled: true,
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'llama3.1',
    temperature: 0.5,
    semanticEnabled: true,
};

afterEach(() => {
    vi.restoreAllMocks();
    invoke.mockReset();
});

describe('semanticSidecar runtime status', () => {
    it('buildSemanticRuntimeStatus marks ready when health is enabled and ready', async () => {
        const { buildSemanticRuntimeStatus } = await import('../semanticSidecar');
        const status = buildSemanticRuntimeStatus(
            baseSettings,
            { enabled: true, ready: true },
            {
                phase: 'running',
                port: 8765,
                spawnedByApp: true,
                healthEnabled: true,
                healthReady: true,
            },
        );
        expect(status.ready).toBe(true);
        expect(status.label).toContain('Ready');
    });

    it('formatSemanticRuntimeLabel surfaces sidecar errors', async () => {
        const { buildSemanticRuntimeStatus } = await import('../semanticSidecar');
        const status = buildSemanticRuntimeStatus(baseSettings, null, {
            phase: 'failed',
            port: 8765,
            spawnedByApp: false,
            error: 'Python not found',
            healthEnabled: false,
            healthReady: false,
        });
        expect(status.label).toBe('Python not found');
    });

    it('shouldManageSemanticSidecar requires desktop + ollama + toggle', async () => {
        const bridge = await import('../../../lib/desktopBridge');
        vi.mocked(bridge.isTauriRuntime).mockReturnValue(false);
        const { shouldManageSemanticSidecar } = await import('../semanticSidecar');
        expect(shouldManageSemanticSidecar(baseSettings)).toBe(false);

        vi.mocked(bridge.isTauriRuntime).mockReturnValue(true);
        expect(shouldManageSemanticSidecar({ ...baseSettings, semanticEnabled: false })).toBe(false);
        expect(shouldManageSemanticSidecar({ ...baseSettings, provider: 'openai-compatible' })).toBe(
            false,
        );
        expect(shouldManageSemanticSidecar(baseSettings)).toBe(true);
    });

    it('invokeStartSemanticSidecar forwards port parsed from base URL', async () => {
        invoke.mockResolvedValue({
            phase: 'running',
            port: 8765,
            spawned_by_app: true,
            health_enabled: true,
            health_ready: true,
        });

        const { invokeStartSemanticSidecar } = await import('../semanticSidecar');
        const status = await invokeStartSemanticSidecar({
            ...baseSettings,
            semanticBaseUrl: 'http://127.0.0.1:8765',
        });

        expect(invoke).toHaveBeenCalledWith('start_semantic_sidecar', { port: 8765 });
        expect(status?.phase).toBe('running');
        expect(status?.spawnedByApp).toBe(true);
    });
});

describe('refreshSemanticRuntimeStatus', () => {
    it('combines health probe and Tauri status', async () => {
        invoke.mockResolvedValue({
            phase: 'external',
            port: 8765,
            spawned_by_app: false,
            health_enabled: true,
            health_ready: true,
        });
        vi.stubGlobal(
            'fetch',
            vi.fn(async () =>
                new Response(JSON.stringify({ enabled: true, ready: true }), { status: 200 }),
            ),
        );

        const { refreshSemanticRuntimeStatus } = await import('../semanticSidecar');
        const status = await refreshSemanticRuntimeStatus(baseSettings);

        expect(status.ready).toBe(true);
        expect(status.sidecar?.phase).toBe('external');
        expect(status.label).toContain('external sidecar');
    });
});
