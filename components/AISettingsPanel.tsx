import React, { useState } from 'react';
import { UseAIReturn } from '../hooks/useAI';
import { AIProviderId, PROVIDER_META } from '../services/ai';

interface AISettingsPanelProps {
    ai: UseAIReturn;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
    <span className={`material-symbols-outlined ${className ?? ''}`}>{name}</span>
);

/**
 * Settings panel for the local-first AI subsystem. Lets the user enable AI,
 * choose a provider (Ollama by default), point it at a base URL, test the
 * connection, and pick from the models the server actually has installed.
 */
const AISettingsPanel: React.FC<AISettingsPanelProps> = ({ ai }) => {
    const { settings, updateSettings, connection, testConnection, setConnection } = ai;
    const [models, setModels] = useState<string[]>(
        connection.status === 'ok' ? connection.models : [],
    );

    const activeMeta = PROVIDER_META.find((p) => p.id === settings.provider);

    const handleProviderChange = (id: AIProviderId) => {
        const meta = PROVIDER_META.find((p) => p.id === id);
        updateSettings({ provider: id, baseUrl: meta?.defaultBaseUrl ?? settings.baseUrl, model: '' });
        setConnection({ status: 'idle' });
        setModels([]);
    };

    const handleTest = async () => {
        const found = await testConnection();
        setModels(found);
        // Auto-select a model if none chosen yet.
        if (found.length > 0 && !settings.model) {
            updateSettings({ model: found[0] });
        }
    };

    const inputClass =
        'w-full text-sm rounded-lg border border-[#27272a] bg-[#09090b] py-2 px-3 text-[#f4f4f5] focus:outline-none focus:ring-2 focus:ring-[#dc2626]';
    const labelClass = 'block text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-1.5';

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Master toggle */}
            <div className="flex items-start justify-between gap-4 rounded-xl border border-[#27272a] p-4">
                <div>
                    <h4 className="text-sm font-semibold text-[#f4f4f5] flex items-center gap-2">
                        <MaterialIcon name="neurology" className="text-[#dc2626]" />
                        Enable AI features
                    </h4>
                    <p className="text-xs text-[#a1a1aa] mt-1 max-w-md">
                        Adds an AI assistant for application insights, faculty outreach drafts, and essay
                        feedback. Local-first — with Ollama, everything runs on your machine and no data
                        leaves your computer.
                    </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.enabled}
                        onChange={(e) => updateSettings({ enabled: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-[#27272a] peer-focus:ring-2 peer-focus:ring-[#dc2626] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#dc2626]" />
                </label>
            </div>

            {settings.enabled && (
                <>
                    {/* Provider */}
                    <div>
                        <label className={labelClass}>Provider</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {PROVIDER_META.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => handleProviderChange(p.id)}
                                    className={`text-left rounded-xl border p-3 transition-colors ${
                                        settings.provider === p.id
                                            ? 'border-[#dc2626] bg-[#dc2626]/10'
                                            : 'border-[#27272a] hover:bg-[#27272a]/40'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 text-sm font-medium text-[#f4f4f5]">
                                        <MaterialIcon
                                            name={p.id === 'ollama' ? 'computer' : 'dns'}
                                            className="text-base text-[#a1a1aa]"
                                        />
                                        {p.label}
                                        {p.local && (
                                            <span className="text-[10px] uppercase tracking-wide bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded">
                                                local
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-[#a1a1aa] mt-1">{p.hint}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Base URL */}
                    <div>
                        <label className={labelClass} htmlFor="ai-base-url">
                            Base URL
                        </label>
                        <input
                            id="ai-base-url"
                            type="text"
                            value={settings.baseUrl}
                            onChange={(e) => updateSettings({ baseUrl: e.target.value })}
                            placeholder={activeMeta?.defaultBaseUrl}
                            className={inputClass}
                            spellCheck={false}
                            autoComplete="off"
                        />
                    </div>

                    {/* Optional API key for hosted OpenAI-compatible endpoints */}
                    {settings.provider === 'openai-compatible' && (
                        <div>
                            <label className={labelClass} htmlFor="ai-api-key">
                                API key <span className="normal-case font-normal">(only for hosted endpoints)</span>
                            </label>
                            <input
                                id="ai-api-key"
                                type="password"
                                value={settings.apiKey ?? ''}
                                onChange={(e) => updateSettings({ apiKey: e.target.value })}
                                placeholder="Leave blank for local servers"
                                className={inputClass}
                                autoComplete="off"
                            />
                        </div>
                    )}

                    {/* Test connection + model discovery */}
                    <div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleTest}
                                disabled={connection.status === 'testing'}
                                className="text-sm font-semibold px-4 py-2 rounded-lg bg-[#27272a] text-[#f4f4f5] hover:bg-[#3f3f46] disabled:opacity-50 flex items-center gap-2 transition-colors"
                            >
                                {connection.status === 'testing' ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                                        Testing…
                                    </>
                                ) : (
                                    <>
                                        <MaterialIcon name="wifi_tethering" className="text-base" />
                                        Test connection
                                    </>
                                )}
                            </button>
                            {connection.status === 'ok' && (
                                <span className="text-xs text-emerald-300 flex items-center gap-1">
                                    <MaterialIcon name="check_circle" className="text-sm" />
                                    Connected · {connection.models.length} model(s)
                                </span>
                            )}
                            {connection.status === 'error' && (
                                <span className="text-xs text-red-300 flex items-center gap-1">
                                    <MaterialIcon name="error" className="text-sm" />
                                    Failed
                                </span>
                            )}
                        </div>
                        {connection.status === 'error' && (
                            <p className="text-xs text-red-300/90 mt-2">{connection.message}</p>
                        )}
                    </div>

                    {/* Model */}
                    <div>
                        <label className={labelClass} htmlFor="ai-model">
                            Model
                        </label>
                        {models.length > 0 ? (
                            <select
                                id="ai-model"
                                value={settings.model}
                                onChange={(e) => updateSettings({ model: e.target.value })}
                                className={inputClass}
                            >
                                <option value="">Select a model…</option>
                                {models.map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                id="ai-model"
                                type="text"
                                value={settings.model}
                                onChange={(e) => updateSettings({ model: e.target.value })}
                                placeholder='e.g. "llama3.1" — or Test connection to list installed models'
                                className={inputClass}
                                spellCheck={false}
                                autoComplete="off"
                            />
                        )}
                    </div>

                    {/* Temperature */}
                    <div>
                        <label className={labelClass} htmlFor="ai-temp">
                            Temperature · {settings.temperature.toFixed(1)}
                        </label>
                        <input
                            id="ai-temp"
                            type="range"
                            min={0}
                            max={2}
                            step={0.1}
                            value={settings.temperature}
                            onChange={(e) => updateSettings({ temperature: Number(e.target.value) })}
                            className="w-full accent-[#dc2626]"
                        />
                        <div className="flex justify-between text-[10px] text-[#a1a1aa] mt-0.5">
                            <span>Precise</span>
                            <span>Creative</span>
                        </div>
                    </div>

                    {settings.provider === 'ollama' && (
                        <div className="rounded-lg border border-[#27272a] bg-[#18181b] p-3 text-xs text-[#a1a1aa] space-y-1">
                            <p className="font-semibold text-[#f4f4f5] flex items-center gap-1.5">
                                <MaterialIcon name="lightbulb" className="text-sm text-[#dc2626]" />
                                Getting started with Ollama
                            </p>
                            <p>1. Install Ollama from ollama.com</p>
                            <p>2. Pull a model: <code className="text-[#E8B4B8]">ollama pull llama3.1</code></p>
                            <p>3. Make sure it’s running, then click Test connection above.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AISettingsPanel;
