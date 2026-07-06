import { afterEach, describe, expect, it, vi } from 'vitest';
import { chatWithSemanticLayer } from '../chat';
import { ollamaProvider } from '../ollama';
import { AISettings, ChatMessage } from '../types';

const baseSettings: AISettings = {
    enabled: true,
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'llama3.1',
    temperature: 0.5,
    semanticEnabled: true,
};

const messages: ChatMessage[] = [
    { role: 'system', content: 'You are helpful.' },
    { role: 'user', content: 'Summarize my portfolio.' },
];

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    return new ReadableStream({
        start(controller) {
            for (const c of chunks) controller.enqueue(encoder.encode(c));
            controller.close();
        },
    });
}

function semanticSseBody(response: string, cacheHit = true): ReadableStream<Uint8Array> {
    const meta = {
        type: 'done',
        response,
        cache_hit: cacheHit,
        model_id: 'cache',
        semantic_latency_ms: 4.2,
        breakdown_ms: { embed: 1.0 },
        cache_similarity: 0.99,
    };
    return streamOf([
        `data: ${JSON.stringify({ type: 'token', content: response })}\n\n`,
        `data: ${JSON.stringify(meta)}\n\n`,
    ]);
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('chatWithSemanticLayer', () => {
    it('uses semantic sidecar stream when healthy and enabled', async () => {
        const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/health')) {
                return new Response(JSON.stringify({ enabled: true, ready: true }), { status: 200 });
            }
            expect(url).toContain('/v1/chat/stream');
            const body = JSON.parse(init?.body as string);
            expect(body.model).toBe('llama3.1');
            expect(body.messages).toEqual(messages);
            return new Response(semanticSseBody('Cached portfolio summary.'), { status: 200 });
        });
        vi.stubGlobal('fetch', fetchMock);

        const tokens: string[] = [];
        const full = await chatWithSemanticLayer(ollamaProvider, baseSettings, {
            messages,
            onToken: (d) => tokens.push(d),
        });

        expect(full).toBe('Cached portfolio summary.');
        expect(tokens.join('')).toBe(full);
        expect(fetchMock).toHaveBeenCalled();
    });

    it('uses JSON chat endpoint when streaming callback is omitted', async () => {
        const fetchMock = vi.fn(async (url: string) => {
            if (url.endsWith('/health')) {
                return new Response(JSON.stringify({ enabled: true, ready: true }), { status: 200 });
            }
            expect(url).toContain('/v1/chat');
            expect(url).not.toContain('/stream');
            return new Response(
                JSON.stringify({
                    response: 'Direct JSON answer.',
                    cache_hit: false,
                    model_id: 'llama3.1',
                    semantic_latency_ms: 10,
                    breakdown_ms: {},
                    cache_similarity: 0,
                }),
                { status: 200 },
            );
        });
        vi.stubGlobal('fetch', fetchMock);

        const full = await chatWithSemanticLayer(ollamaProvider, baseSettings, { messages });
        expect(full).toBe('Direct JSON answer.');
    });

    it('falls back to direct provider when sidecar health fails', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string) => {
                if (url.endsWith('/health')) {
                    return new Response(JSON.stringify({ enabled: false, ready: false }), { status: 200 });
                }
                throw new Error('should not call chat endpoint');
            }),
        );

        const providerChat = vi.spyOn(ollamaProvider, 'chat').mockResolvedValue('Direct answer');

        const full = await chatWithSemanticLayer(ollamaProvider, baseSettings, { messages });
        expect(full).toBe('Direct answer');
        expect(providerChat).toHaveBeenCalledOnce();
    });

    it('waits briefly for sidecar warmup before falling back', async () => {
        let healthCalls = 0;
        const fetchMock = vi.fn(async (url: string) => {
            if (url.endsWith('/health')) {
                healthCalls += 1;
                if (healthCalls < 3) {
                    return new Response(JSON.stringify({ enabled: true, ready: false }), { status: 200 });
                }
                return new Response(JSON.stringify({ enabled: true, ready: true }), { status: 200 });
            }
            return new Response(
                JSON.stringify({
                    response: 'Warmup answer.',
                    cache_hit: false,
                    model_id: 'llama3.1',
                    semantic_latency_ms: 10,
                    breakdown_ms: {},
                    cache_similarity: 0,
                }),
                { status: 200 },
            );
        });
        vi.stubGlobal('fetch', fetchMock);

        const full = await chatWithSemanticLayer(ollamaProvider, baseSettings, { messages });
        expect(full).toBe('Warmup answer.');
        expect(healthCalls).toBeGreaterThanOrEqual(3);
    });

    it('skips semantic layer for non-Ollama providers', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const providerChat = vi.spyOn(ollamaProvider, 'chat').mockResolvedValue('Direct');

        await chatWithSemanticLayer(
            ollamaProvider,
            { ...baseSettings, provider: 'openai-compatible', semanticEnabled: true },
            { messages },
        );

        expect(fetchMock).not.toHaveBeenCalled();
        expect(providerChat).toHaveBeenCalledOnce();
    });
});

describe('semanticBridge message routing', () => {
    it('resolveSemanticEnabled respects settings override', async () => {
        const { resolveSemanticEnabled, readBuildTimeSemanticDefault } = await import('../semanticBridge');
        expect(resolveSemanticEnabled({ ...baseSettings, semanticEnabled: false })).toBe(false);
        expect(resolveSemanticEnabled({ ...baseSettings, semanticEnabled: true })).toBe(true);
        expect(readBuildTimeSemanticDefault()).toBe(true);
    });

    it('consumeSemanticSseStream parses token and done events', async () => {
        const { consumeSemanticSseStream } = await import('../semanticBridge');
        const tokens: string[] = [];
        const result = await consumeSemanticSseStream(
            semanticSseBody('Hello stream'),
            undefined,
            (delta) => tokens.push(delta),
        );
        expect(tokens.join('')).toBe('Hello stream');
        expect(result.response).toBe('Hello stream');
        expect(result.cache_hit).toBe(true);
    });
});
