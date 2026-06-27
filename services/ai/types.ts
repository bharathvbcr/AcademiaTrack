/**
 * AcademiaTrack AI subsystem — shared types.
 *
 * Design priority: local, private inference. Ollama is the default provider and
 * the recommended path; an OpenAI-compatible provider covers LM Studio,
 * llama.cpp, vLLM, Jan, and (optionally) hosted endpoints. No application data
 * ever leaves the machine unless the user explicitly points a provider at a
 * remote base URL.
 */

export type AIProviderId = 'ollama' | 'openai-compatible';

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
    role: ChatRole;
    content: string;
}

export interface AISettings {
    /** Master switch — when false the assistant UI is hidden and no requests are made. */
    enabled: boolean;
    provider: AIProviderId;
    /**
     * Base URL of the inference server.
     *  - ollama:            http://localhost:11434
     *  - openai-compatible: http://localhost:1234/v1  (include the /v1 suffix)
     */
    baseUrl: string;
    /** Model identifier, e.g. "llama3.1", "qwen2.5", "gpt-4o-mini". */
    model: string;
    /** Optional bearer token for hosted OpenAI-compatible endpoints. Unused for local Ollama. */
    apiKey?: string;
    /** Sampling temperature, 0–2. */
    temperature: number;
}

export interface ChatOptions {
    messages: ChatMessage[];
    temperature?: number;
    /** Abort in-flight generation (used by the Stop button). */
    signal?: AbortSignal;
    /** Streaming callback — invoked with each incremental token/delta of text. */
    onToken?: (delta: string) => void;
}

/**
 * A pluggable inference backend. Implementations are pure with respect to React
 * and depend only on `fetch`, so they are unit-testable in isolation.
 */
export interface AIProvider {
    readonly id: AIProviderId;
    /** List models the server currently has available. */
    listModels(settings: AISettings, signal?: AbortSignal): Promise<string[]>;
    /** Run a (streaming) chat completion. Resolves with the full assistant text. */
    chat(settings: AISettings, options: ChatOptions): Promise<string>;
}

export class AIError extends Error {
    constructor(message: string, readonly cause?: unknown) {
        super(message);
        this.name = 'AIError';
    }
}
