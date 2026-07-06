/**
 * Client for the local Python semantic layer sidecar.
 *
 * When enabled, chat requests flow through cache → router → RAG compressor → LLM
 * before falling back to direct provider calls if the sidecar is unreachable.
 */
import { readLines } from './stream';
import { AIError, AISettings, ChatMessage, ChatOptions } from './types';

export interface SemanticChatResponse {
    response: string;
    cache_hit: boolean;
    model_id: string;
    semantic_latency_ms: number;
    breakdown_ms: Record<string, number>;
    cache_similarity: number;
}

export interface SemanticHealthResponse {
    enabled: boolean;
    ready: boolean;
}

type SemanticSseEvent =
    | { type: 'token'; content: string }
    | ({ type: 'done' } & SemanticChatResponse)
    | { type: 'error'; error?: string };

/** Default sidecar URL — matches semantic_layer.config SemanticLayerConfig.server_port. */
export const DEFAULT_SEMANTIC_BASE_URL = 'http://127.0.0.1:8765';

/** Build-time default from Vite; on unless VITE_SEMANTIC_ENABLED=0. */
export function readBuildTimeSemanticDefault(): boolean {
    try {
        const flag = import.meta.env.VITE_SEMANTIC_ENABLED;
        if (flag === '0' || flag === 'false') return false;
        if (flag === '1' || flag === 'true') return true;
        return true;
    } catch {
        return true;
    }
}

export function resolveSemanticEnabled(settings: AISettings): boolean {
    if (settings.semanticEnabled !== undefined) {
        return settings.semanticEnabled;
    }
    return readBuildTimeSemanticDefault();
}

export function resolveSemanticBaseUrl(settings: AISettings): string {
    return settings.semanticBaseUrl?.replace(/\/+$/, '') || DEFAULT_SEMANTIC_BASE_URL;
}

/** Parse SSE events from the semantic sidecar stream endpoint. */
export async function consumeSemanticSseStream(
    body: ReadableStream<Uint8Array>,
    signal: AbortSignal | undefined,
    onToken?: (delta: string) => void,
): Promise<SemanticChatResponse> {
    let meta: SemanticChatResponse | null = null;

    for await (const line of readLines(body, signal)) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice('data:'.length).trim();
        if (!payload) continue;

        let event: SemanticSseEvent;
        try {
            event = JSON.parse(payload) as SemanticSseEvent;
        } catch {
            continue;
        }

        if (event.type === 'token' && event.content) {
            onToken?.(event.content);
        } else if (event.type === 'done') {
            meta = {
                response: event.response,
                cache_hit: event.cache_hit,
                model_id: event.model_id,
                semantic_latency_ms: event.semantic_latency_ms,
                breakdown_ms: event.breakdown_ms,
                cache_similarity: event.cache_similarity,
            };
        } else if (event.type === 'error') {
            throw new AIError(event.error || 'Semantic layer stream error.');
        }
    }

    if (!meta) {
        throw new AIError('Semantic layer stream ended without a completion event.');
    }
    return meta;
}

export async function probeSemanticHealth(
    baseUrl: string,
    signal?: AbortSignal,
): Promise<SemanticHealthResponse | null> {
    try {
        const res = await fetch(`${baseUrl}/health`, { signal });
        if (!res.ok) return null;
        return (await res.json()) as SemanticHealthResponse;
    } catch {
        return null;
    }
}

const sleep = (ms: number, signal?: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
        }
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener(
            'abort',
            () => {
                clearTimeout(timer);
                reject(new DOMException('Aborted', 'AbortError'));
            },
            { once: true },
        );
    });

/**
 * Poll sidecar /health until ready or timeout. Used while the dev sidecar is warming up.
 */
export async function waitForSemanticHealth(
    baseUrl: string,
    options: { signal?: AbortSignal; timeoutMs?: number; intervalMs?: number } = {},
): Promise<SemanticHealthResponse | null> {
    const timeoutMs = options.timeoutMs ?? 8000;
    const intervalMs = options.intervalMs ?? 300;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const health = await probeSemanticHealth(baseUrl, options.signal);
        if (health?.enabled && health.ready) return health;
        if (health && !health.enabled) return health;
        await sleep(intervalMs, options.signal);
    }
    return probeSemanticHealth(baseUrl, options.signal);
}

export async function chatViaSemanticLayer(
    settings: AISettings,
    messages: ChatMessage[],
    options: Pick<ChatOptions, 'signal' | 'onToken'> = {},
): Promise<SemanticChatResponse> {
    const baseUrl = resolveSemanticBaseUrl(settings);
    const useStream = Boolean(options.onToken);
    const endpoint = useStream ? '/v1/chat/stream' : '/v1/chat';

    let res: Response;
    try {
        res = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: options.signal,
            body: JSON.stringify({
                messages,
                model: settings.model,
                ollama_base_url: settings.baseUrl,
                model_version: `${settings.provider}:${settings.model}`,
            }),
        });
    } catch (e) {
        if ((e as Error)?.name === 'AbortError') throw e;
        throw new AIError('Semantic layer unavailable.', e);
    }

    if (res.status === 503) {
        throw new AIError('Semantic layer unavailable.');
    }
    if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new AIError(`Semantic layer error ${res.status}: ${detail || res.statusText}.`);
    }

    if (useStream) {
        if (!res.body) {
            throw new AIError('Semantic layer returned an empty response stream.');
        }
        return consumeSemanticSseStream(res.body, options.signal, options.onToken);
    }

    return (await res.json()) as SemanticChatResponse;
}
