/**
 * AI subsystem entry point — provider registry and defaults.
 *
 * Local-first by design: the default provider is Ollama pointed at localhost, so
 * a fresh install does inference entirely on-device with zero configuration once
 * the user has Ollama running.
 */
import { AIProvider, AIProviderId, AISettings } from './types';
import { ollamaProvider } from './ollama';
import { openAICompatibleProvider } from './openaiCompatible';

export * from './types';
export * from './prompts';

const PROVIDERS: Record<AIProviderId, AIProvider> = {
    ollama: ollamaProvider,
    'openai-compatible': openAICompatibleProvider,
};

export function getProvider(id: AIProviderId): AIProvider {
    return PROVIDERS[id] ?? ollamaProvider;
}

export interface ProviderMeta {
    id: AIProviderId;
    label: string;
    /** Sensible default base URL when the user switches to this provider. */
    defaultBaseUrl: string;
    /** One-line UI hint. */
    hint: string;
    local: boolean;
}

export const PROVIDER_META: ProviderMeta[] = [
    {
        id: 'ollama',
        label: 'Ollama (local)',
        defaultBaseUrl: 'http://localhost:11434',
        hint: 'Recommended. Runs fully on your machine. Install from ollama.com, then `ollama pull llama3.1`.',
        local: true,
    },
    {
        id: 'openai-compatible',
        label: 'OpenAI-compatible',
        defaultBaseUrl: 'http://localhost:1234/v1',
        hint: 'For LM Studio, llama.cpp, vLLM, Jan, or any OpenAI-style endpoint. Include the /v1 suffix.',
        local: true,
    },
];

export const AI_SETTINGS_STORAGE_KEY = 'ai-settings';

export const DEFAULT_AI_SETTINGS: AISettings = {
    enabled: false,
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: '',
    apiKey: '',
    temperature: 0.7,
};
