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

    const provider = useMemo(() => getProvider(settings.provider), [settings.provider]);

    const updateSettings = useCallback(
        (patch: Partial<AISettings>) => {
            setSettings((prev) => ({ ...prev, ...patch }));
        },
        [setSettings],
    );

    /** Probe the configured server and fetch its available models. */
    const testConnection = useCallback(async (): Promise<string[]> => {
        setConnection({ status: 'testing' });
        try {
            const models = await getProvider(settings.provider).listModels(settings);
            setConnection({ status: 'ok', models });
            return models;
        } catch (e) {
            const message = e instanceof AIError ? e.message : (e as Error)?.message ?? 'Unknown error';
            setConnection({ status: 'error', message });
            return [];
        }
    }, [settings]);

    /** Stop any in-flight generation. */
    const stop = useCallback(() => {
        abortRef.current?.abort();
        abortRef.current = null;
        setIsGenerating(false);
    }, []);

    /**
     * Run a streaming chat completion. `onToken` receives incremental deltas;
     * the promise resolves with the full text. Throws AIError on failure.
     */
    const chat = useCallback(
        async (messages: ChatMessage[], onToken?: (delta: string) => void): Promise<string> => {
            if (!settings.enabled) {
                throw new AIError('AI features are turned off. Enable them in Settings → AI.');
            }
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            setIsGenerating(true);
            try {
                return await provider.chat(settings, {
                    messages,
                    signal: controller.signal,
                    onToken,
                });
            } finally {
                if (abortRef.current === controller) abortRef.current = null;
                setIsGenerating(false);
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
        chat,
        stop,
        isGenerating,
        isConfigured,
    };
}

export type UseAIReturn = ReturnType<typeof useAI>;
