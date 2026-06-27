/**
 * Ollama provider — the recommended, fully-local default.
 *
 * Talks to Ollama's native REST API (https://github.com/ollama/ollama/blob/main/docs/api.md):
 *   GET  {base}/api/tags   → installed models
 *   POST {base}/api/chat   → streaming NDJSON chat completion
 */
import { AIProvider, AISettings, ChatOptions, AIError } from './types';
import { readLines } from './stream';

/** Strip a trailing slash so URL joins are predictable. */
function normalizeBase(baseUrl: string): string {
    return baseUrl.replace(/\/+$/, '');
}

export const ollamaProvider: AIProvider = {
    id: 'ollama',

    async listModels(settings: AISettings, signal?: AbortSignal): Promise<string[]> {
        const base = normalizeBase(settings.baseUrl);
        let res: Response;
        try {
            res = await fetch(`${base}/api/tags`, { signal });
        } catch (e) {
            throw new AIError(
                `Could not reach Ollama at ${base}. Is it running? Start it with "ollama serve".`,
                e,
            );
        }
        if (!res.ok) {
            throw new AIError(`Ollama returned ${res.status} when listing models.`);
        }
        const data = (await res.json()) as { models?: Array<{ name: string }> };
        return (data.models ?? []).map((m) => m.name).sort((a, b) => a.localeCompare(b));
    },

    async chat(settings: AISettings, options: ChatOptions): Promise<string> {
        const base = normalizeBase(settings.baseUrl);
        if (!settings.model) {
            throw new AIError('No model selected. Pick a model in Settings → AI.');
        }

        let res: Response;
        try {
            res = await fetch(`${base}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: options.signal,
                body: JSON.stringify({
                    model: settings.model,
                    messages: options.messages,
                    stream: true,
                    options: {
                        temperature: options.temperature ?? settings.temperature,
                    },
                }),
            });
        } catch (e) {
            if ((e as Error)?.name === 'AbortError') throw e;
            throw new AIError(
                `Could not reach Ollama at ${base}. Is it running? Start it with "ollama serve".`,
                e,
            );
        }

        if (!res.ok) {
            const detail = await res.text().catch(() => '');
            throw new AIError(
                `Ollama error ${res.status}: ${detail || res.statusText}. ` +
                    `If the model is missing, run "ollama pull ${settings.model}".`,
            );
        }
        if (!res.body) throw new AIError('Ollama returned an empty response stream.');

        let full = '';
        for await (const line of readLines(res.body, options.signal)) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            let parsed: { message?: { content?: string }; done?: boolean; error?: string };
            try {
                parsed = JSON.parse(trimmed);
            } catch {
                continue; // ignore malformed keep-alive fragments
            }
            if (parsed.error) throw new AIError(`Ollama error: ${parsed.error}`);
            const delta = parsed.message?.content;
            if (delta) {
                full += delta;
                options.onToken?.(delta);
            }
            if (parsed.done) break;
        }
        return full;
    },
};
