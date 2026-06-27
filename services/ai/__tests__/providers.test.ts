import { afterEach, describe, expect, it, vi } from 'vitest';
import { readLines } from '../stream';
import { ollamaProvider } from '../ollama';
import { openAICompatibleProvider } from '../openaiCompatible';
import { AISettings } from '../types';

/** Build a ReadableStream that emits the given string chunks (as the network would). */
function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    return new ReadableStream({
        start(controller) {
            for (const c of chunks) controller.enqueue(encoder.encode(c));
            controller.close();
        },
    });
}

const ollamaSettings: AISettings = {
    enabled: true,
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'llama3.1',
    temperature: 0.5,
};

const openAISettings: AISettings = {
    enabled: true,
    provider: 'openai-compatible',
    baseUrl: 'http://localhost:1234/v1',
    model: 'local-model',
    apiKey: 'secret',
    temperature: 0.5,
};

afterEach(() => {
    vi.restoreAllMocks();
});

describe('readLines', () => {
    it('reassembles lines split across chunk boundaries', async () => {
        const stream = streamOf(['hel', 'lo\nwor', 'ld\n', 'tail']);
        const lines: string[] = [];
        for await (const line of readLines(stream)) lines.push(line);
        expect(lines).toEqual(['hello', 'world', 'tail']);
    });
});

describe('ollamaProvider', () => {
    it('lists and sorts installed models', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () =>
                new Response(JSON.stringify({ models: [{ name: 'qwen2.5' }, { name: 'llama3.1' }] }), { status: 200 }),
            ),
        );
        const models = await ollamaProvider.listModels(ollamaSettings);
        expect(models).toEqual(['llama3.1', 'qwen2.5']);
    });

    it('streams NDJSON chat deltas and accumulates the full text', async () => {
        const body = streamOf([
            JSON.stringify({ message: { content: 'Hello' }, done: false }) + '\n',
            JSON.stringify({ message: { content: ' world' }, done: false }) + '\n',
            JSON.stringify({ message: { content: '' }, done: true }) + '\n',
        ]);
        const fetchMock = vi.fn(async () => new Response(body, { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        const tokens: string[] = [];
        const full = await ollamaProvider.chat(ollamaSettings, {
            messages: [{ role: 'user', content: 'hi' }],
            onToken: (d) => tokens.push(d),
        });

        expect(full).toBe('Hello world');
        expect(tokens).toEqual(['Hello', ' world']);
        // Verify request shape: native /api/chat with streaming enabled.
        const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe('http://localhost:11434/api/chat');
        const sent = JSON.parse(init.body as string);
        expect(sent.stream).toBe(true);
        expect(sent.model).toBe('llama3.1');
        expect(sent.options.temperature).toBe(0.5);
    });

    it('surfaces a helpful error when the model is missing', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('model not found', { status: 404 })));
        await expect(
            ollamaProvider.chat(ollamaSettings, { messages: [{ role: 'user', content: 'hi' }] }),
        ).rejects.toThrow(/ollama pull llama3\.1/);
    });
});

describe('openAICompatibleProvider', () => {
    it('parses SSE deltas and stops at [DONE]', async () => {
        const body = streamOf([
            'data: ' + JSON.stringify({ choices: [{ delta: { content: 'Hi' } }] }) + '\n',
            'data: ' + JSON.stringify({ choices: [{ delta: { content: ' there' } }] }) + '\n',
            'data: [DONE]\n',
        ]);
        const fetchMock = vi.fn(async () => new Response(body, { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        const full = await openAICompatibleProvider.chat(openAISettings, {
            messages: [{ role: 'user', content: 'hi' }],
        });
        expect(full).toBe('Hi there');
        // Sends the bearer token and hits /chat/completions.
        const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe('http://localhost:1234/v1/chat/completions');
        expect(init.headers).toMatchObject({ Authorization: 'Bearer secret' });
    });

    it('reads models from the OpenAI data envelope', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response(JSON.stringify({ data: [{ id: 'm-b' }, { id: 'm-a' }] }), { status: 200 })),
        );
        const models = await openAICompatibleProvider.listModels(openAISettings);
        expect(models).toEqual(['m-a', 'm-b']);
    });
});
