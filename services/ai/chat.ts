/**
 * Unified chat entry point — semantic layer first, direct provider fallback.
 */
import { AIProvider, AISettings, ChatOptions } from './types';
import {
    chatViaSemanticLayer,
    resolveSemanticEnabled,
    resolveSemanticBaseUrl,
    waitForSemanticHealth,
} from './semanticBridge';

export interface ChatResultMeta {
    viaSemanticLayer: boolean;
    cacheHit?: boolean;
    semanticLatencyMs?: number;
}

export interface UnifiedChatOptions extends ChatOptions {
    /** Called after a successful completion with routing metadata. */
    onMeta?: (meta: ChatResultMeta) => void;
}

/**
 * Run chat through the semantic pipeline when enabled and healthy; otherwise use
 * the configured provider directly. Semantic failures never block inference.
 */
export async function chatWithSemanticLayer(
    provider: AIProvider,
    settings: AISettings,
    options: UnifiedChatOptions,
): Promise<string> {
    const useSemantic = resolveSemanticEnabled(settings) && settings.provider === 'ollama';

    if (useSemantic) {
        try {
            const baseUrl = resolveSemanticBaseUrl(settings);
            const health = await waitForSemanticHealth(baseUrl, {
                signal: options.signal,
                timeoutMs: 6000,
            });
            if (health?.enabled && health.ready) {
                const result = await chatViaSemanticLayer(settings, options.messages, options);
                options.onMeta?.({
                    viaSemanticLayer: true,
                    cacheHit: result.cache_hit,
                    semanticLatencyMs: result.semantic_latency_ms,
                });
                return result.response;
            }
        } catch (e) {
            if ((e as Error)?.name === 'AbortError') throw e;
            if (import.meta.env?.DEV) {
                console.warn('[semantic] falling back to direct provider:', e);
            }
        }
    }

    const response = await provider.chat(settings, options);
    options.onMeta?.({ viaSemanticLayer: false });
    return response;
}
