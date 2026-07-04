import { useCallback, useMemo, useRef, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';
import {
    AISettings,
    ChatMessage,
    DEFAULT_AI_SETTINGS,
    AI_SETTINGS_STORAGE_KEY,
    getProvider,
    AIError,
} from '../services/ai';

export type ConnectionState =
    | { status: 'idle' }
    | { status: 'testing' }
    | { status: 'ok'; models: string[] }
    | { status: 'error'; message: string };

/**
 * Central hook for the AI subsystem: persists settings, exposes a streaming
 * `chat` call, a `testConnection`/model-discovery helper, and an abort control.
 *
 * Settings live in localStorage (same store as the rest of the app) so the whole
 * configuration — including the choice of a local provider — survives restarts.
 */
export function useAI() {
    const [settings, setSettings] = useLocalStorage<AISettings>(
        AI_SETTINGS_STORAGE_KEY,
        DEFAULT_AI_SETTINGS,
    );
    const [connection, setConnection] = useState<ConnectionState>({ status: 'idle' });
    const [isGenerating, setIsGenerating] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const generationOwnerRef = useRef<string | null>(null);
    const connectionAbortRef = useRef<AbortController | null>(null);
    const connectionRequestIdRef = useRef(0);

    const provider = useMemo(() => getProvider(settings.provider), [settings.provider]);

    const updateSettings = useCallback(
        (patch: Partial<AISettings>) => {
            setSettings((prev) => ({ ...prev, ...patch }));
        },
        [setSettings],
    );

    /** Probe the configured server and fetch its available models. */
    const testConnection = useCallback(async (): Promise<string[]> => {
        const requestId = connectionRequestIdRef.current + 1;
        connectionRequestIdRef.current = requestId;
        connectionAbortRef.current?.abort();
        const controller = new AbortController();
        connectionAbortRef.current = controller;
        setConnection({ status: 'testing' });
        try {
            const models = await getProvider(settings.provider).listModels(settings, controller.signal);
            if (connectionRequestIdRef.current !== requestId) {
                return [];
            }
            setConnection({ status: 'ok', models });
            return models;
        } catch (e) {
            if ((e as Error)?.name === 'AbortError') {
                return [];
            }
            const message = e instanceof AIError ? e.message : (e as Error)?.message ?? 'Unknown error';
            if (connectionRequestIdRef.current === requestId) {
                setConnection({ status: 'error', message });
            }
            return [];
        } finally {
            if (connectionAbortRef.current === controller) {
                connectionAbortRef.current = null;
            }
        }
    }, [settings]);

    const stopTesting = useCallback(() => {
        connectionRequestIdRef.current += 1;
        connectionAbortRef.current?.abort();
        connectionAbortRef.current = null;
        setConnection((prev) => (prev.status === 'testing' ? { status: 'idle' } : prev));
    }, []);

    /** Stop any in-flight generation. */
    const stop = useCallback((owner?: string) => {
        if (owner && generationOwnerRef.current !== owner) {
            return;
        }
        abortRef.current?.abort();
        abortRef.current = null;
        generationOwnerRef.current = null;
        setIsGenerating(false);
    }, []);

    /**
     * Run a streaming chat completion. `onToken` receives incremental deltas;
     * the promise resolves with the full text. Throws AIError on failure.
     */
    const chat = useCallback(
        async (
            messages: ChatMessage[],
            onToken?: (delta: string) => void,
            owner = 'shared-ai-session',
        ): Promise<string> => {
            if (!settings.enabled) {
                throw new AIError('AI features are turned off. Enable them in Settings → AI.');
            }
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            generationOwnerRef.current = owner;
            setIsGenerating(true);
            try {
                return await provider.chat(settings, {
                    messages,
                    signal: controller.signal,
                    onToken,
                });
            } finally {
                if (abortRef.current === controller) {
                    abortRef.current = null;
                    generationOwnerRef.current = null;
                    setIsGenerating(false);
                }
            }
        },
        [provider, settings],
    );

    const isConfigured = settings.enabled && Boolean(settings.baseUrl) && Boolean(settings.model);

    return {
        settings,
        updateSettings,
        connection,
        setConnection,
        testConnection,
        stopTesting,
        chat,
        stop,
        isGenerating,
        isConfigured,
    };
}

export type UseAIReturn = ReturnType<typeof useAI>;
