/**
 * OpenAI-compatible provider — covers LM Studio, llama.cpp server, vLLM, Jan,
 * text-generation-webui, and (if the user opts in) hosted endpoints.
 *
 * The `baseUrl` is expected to already include the API version segment, e.g.
 * "http://localhost:1234/v1". Endpoints used:
 *   GET  {base}/models            → available models
 *   POST {base}/chat/completions  → streaming SSE chat completion
 */
import { AIProvider, AISettings, ChatOptions, AIError } from './types';
import { readLines } from './stream';

function normalizeBase(baseUrl: string): string {
    return baseUrl.replace(/\/+$/, '');
}

function authHeaders(settings: AISettings): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (settings.apiKey) headers.Authorization = `Bearer ${settings.apiKey}`;
    return headers;
}

export const openAICompatibleProvider: AIProvider = {
    id: 'openai-compatible',

    async listModels(settings: AISettings, signal?: AbortSignal): Promise<string[]> {
        const base = normalizeBase(settings.baseUrl);
        let res: Response;
        try {
            res = await fetch(`${base}/models`, { headers: authHeaders(settings), signal });
        } catch (e) {
            throw new AIError(`Could not reach the AI server at ${base}.`, e);
        }
        if (!res.ok) {
            throw new AIError(`Server returned ${res.status} when listing models.`);
        }
        const data = (await res.json()) as { data?: Array<{ id: string }> };
        return (data.data ?? []).map((m) => m.id).sort((a, b) => a.localeCompare(b));
    },

    async chat(settings: AISettings, options: ChatOptions): Promise<string> {
        const base = normalizeBase(settings.baseUrl);
        if (!settings.model) {
            throw new AIError('No model selected. Pick a model in Settings → AI.');
        }

        let res: Response;
        try {
            res = await fetch(`${base}/chat/completions`, {
                method: 'POST',
                headers: authHeaders(settings),
                signal: options.signal,
                body: JSON.stringify({
                    model: settings.model,
                    messages: options.messages,
                    stream: true,
                    temperature: options.temperature ?? settings.temperature,
                }),
            });
        } catch (e) {
            if ((e as Error)?.name === 'AbortError') throw e;
            throw new AIError(`Could not reach the AI server at ${base}.`, e);
        }

        if (!res.ok) {
            const detail = await res.text().catch(() => '');
            throw new AIError(`AI server error ${res.status}: ${detail || res.statusText}.`);
        }
        if (!res.body) throw new AIError('AI server returned an empty response stream.');

        let full = '';
        for await (const line of readLines(res.body, options.signal)) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice('data:'.length).trim();
            if (payload === '[DONE]') break;
            let parsed: {
                choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
                error?: { message?: string } | string;
            };
            try {
                parsed = JSON.parse(payload);
            } catch {
                continue;
            }
            if (parsed.error) {
                const msg = typeof parsed.error === 'string' ? parsed.error : parsed.error.message;
                throw new AIError(`AI server error: ${msg ?? 'unknown error'}`);
            }
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
                full += delta;
                options.onToken?.(delta);
            }
        }
        return full;
    },
};
