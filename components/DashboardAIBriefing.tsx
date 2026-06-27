import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Application } from '../types';
import { UseAIReturn } from '../hooks/useAI';
import { AIError, buildPortfolioInsightsMessages } from '../services/ai';

interface DashboardAIBriefingProps {
    applications: Application[];
    ai: UseAIReturn;
    /** Opens Settings on the AI tab so the user can pick a local model. */
    onConfigureAI: () => void;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
    <span className={`material-symbols-outlined ${className ?? ''}`}>{name}</span>
);

/**
 * On-demand portfolio briefing rendered on the dashboard. Brings the local-first
 * AI assistant onto the app's landing view: one click streams a grounded read of
 * the whole application portfolio from the user's configured local model
 * (Ollama by default). All inference stays on the machine — the briefing reuses
 * the same prompt builder as the assistant modal so the two stay consistent.
 */
const DashboardAIBriefing: React.FC<DashboardAIBriefingProps> = ({
    applications,
    ai,
    onConfigureAI,
}) => {
    const { chat, stop, isGenerating, isConfigured, settings } = ai;
    const [briefing, setBriefing] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [hasRun, setHasRun] = useState(false);
    const [minimized, setMinimized] = useState(false);

    const providerLabel = settings.provider === 'ollama' ? 'Ollama' : 'Local model';

    const generate = async () => {
        if (!isConfigured || isGenerating) return;
        setError(null);
        setBriefing('');
        setHasRun(true);
        try {
            await chat(buildPortfolioInsightsMessages(applications), (delta) => {
                setBriefing((prev) => prev + delta);
            });
        } catch (e) {
            if ((e as Error)?.name === 'AbortError') return; // user pressed Stop
            const msg = e instanceof AIError ? e.message : (e as Error)?.message ?? 'Something went wrong.';
            setError(msg);
        }
    };

    return (
        <section className="my-6 rounded-xl border border-[#27272a] bg-[#18181b]/80 p-4 text-[#f4f4f5]">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <MaterialIcon name="neurology" className="text-[#C03050]" />
                    AI Briefing
                    <span className="text-[10px] uppercase tracking-wide bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded">
                        local
                    </span>
                    {isConfigured && (
                        <span className="text-xs font-normal text-[#a1a1aa]">
                            {providerLabel}
                            {settings.model ? ` · ${settings.model}` : ''}
                        </span>
                    )}
                </h3>

                <div className="flex items-center gap-2 shrink-0">
                    {isConfigured && !minimized && (
                        <>
                            {isGenerating ? (
                                <button
                                    onClick={stop}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#27272a] text-[#f4f4f5] hover:bg-[#3f3f46] flex items-center gap-1.5 transition-colors"
                                >
                                    <MaterialIcon name="stop" className="text-sm" /> Stop
                                </button>
                            ) : (
                                <button
                                    onClick={generate}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#C03050] text-white hover:bg-[#a02845] flex items-center gap-1.5 transition-colors"
                                >
                                    <MaterialIcon name={hasRun ? 'refresh' : 'auto_awesome'} className="text-sm" />
                                    {hasRun ? 'Regenerate' : 'Generate briefing'}
                                </button>
                            )}
                        </>
                    )}
                    <button
                        onClick={() => setMinimized((m) => !m)}
                        className="p-1 rounded-md text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a] transition-colors"
                        title={minimized ? 'Expand' : 'Minimize'}
                    >
                        <MaterialIcon name={minimized ? 'expand_more' : 'expand_less'} className="text-base" />
                    </button>
                </div>
            </div>

            <AnimatePresence initial={false}>
                {!minimized && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        {!isConfigured ? (
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#a1a1aa]">
                                <p className="max-w-md">
                                    Get an at-a-glance read of your portfolio — what needs attention, where you're
                                    behind, deadline risks — generated entirely on your machine by a local model.
                                </p>
                                <button
                                    onClick={onConfigureAI}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#C03050] text-white hover:bg-[#a02845] transition-colors shrink-0"
                                >
                                    Set up a local model
                                </button>
                            </div>
                        ) : (
                            <>
                                <AnimatePresence initial={false}>
                                    {(briefing || isGenerating) && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mt-3 overflow-hidden"
                                        >
                                            {briefing ? (
                                                <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-headings:mt-2 prose-headings:mb-1 prose-ul:my-1 prose-li:my-0.5 text-[#F5D7DA]">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{briefing}</ReactMarkdown>
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center gap-2 text-[#E8B4B8]/70 text-sm">
                                                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                                                    Reading your portfolio…
                                                </span>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {!hasRun && !isGenerating && (
                                    <p className="mt-2 text-xs text-[#a1a1aa]">
                                        Generate a private, grounded summary of all {applications.length} application(s).
                                    </p>
                                )}

                                {(briefing || hasRun) && !isGenerating && (
                                    <p className="mt-2 text-[10px] text-[#E8B4B8]/50 flex items-center gap-1">
                                        <MaterialIcon name="lock" className="text-xs" />
                                        Generated by your local model — your data stayed on your machine.
                                    </p>
                                )}
                            </>
                        )}

                        {error && (
                            <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300 flex items-start gap-2">
                                <MaterialIcon name="error" className="text-sm mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default DashboardAIBriefing;
