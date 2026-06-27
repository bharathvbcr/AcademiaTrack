import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { backdropVariants, modalVariants } from '../hooks/useAnimations';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { Application } from '../types';
import { UseAIReturn } from '../hooks/useAI';
import {
    ChatMessage,
    SYSTEM_PROMPT,
    AIError,
    buildPortfolioInsightsMessages,
    buildNextStepsMessages,
    buildFacultyEmailMessages,
    buildEssayFeedbackMessages,
    summarizeApplication,
} from '../services/ai';

interface AIAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
    applications: Application[];
    ai: UseAIReturn;
    /** Opens Settings on the AI tab (shown when AI isn't configured yet). */
    onOpenSettings: () => void;
}

interface UIMessage {
    role: 'user' | 'assistant';
    content: string;
    /** Short label shown above user turns triggered by a quick action. */
    label?: string;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
    <span className={`material-symbols-outlined ${className ?? ''}`}>{name}</span>
);

const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
    isOpen,
    onClose,
    applications,
    ai,
    onOpenSettings,
}) => {
    useLockBodyScroll(isOpen);
    useEscapeKey(isOpen, onClose);

    const [messages, setMessages] = useState<UIMessage[]>([]);
    const [input, setInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [contextAppId, setContextAppId] = useState<string>('');
    const [facultyId, setFacultyId] = useState<string>('');
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { chat, stop, isGenerating, isConfigured, settings } = ai;

    const contextApp = useMemo(
        () => applications.find((a) => a.id === contextAppId),
        [applications, contextAppId],
    );
    const facultyContacts = contextApp?.facultyContacts ?? [];

    // Keep the transcript scrolled to the newest content as tokens stream in.
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }, [messages]);

    // Reset volatile state each time the modal opens.
    useEffect(() => {
        if (isOpen) setError(null);
    }, [isOpen]);

    // On unmount (modal closed mid-stream), abort generation so the parent
    // hook's streaming callback stops writing to this unmounted component, and
    // clear any pending "Copied" reset timer.
    useEffect(() => () => {
        stop();
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    }, [stop]);

    /** Append a user turn + a streaming assistant turn driven by `messages`. */
    const run = async (apiMessages: ChatMessage[], display: { user: string; label?: string }) => {
        if (!isConfigured) {
            setError('Configure a model in Settings → AI to start.');
            return;
        }
        setError(null);
        setMessages((prev) => [
            ...prev,
            { role: 'user', content: display.user, label: display.label },
            { role: 'assistant', content: '' },
        ]);
        try {
            await chat(apiMessages, (delta) => {
                setMessages((prev) => {
                    const next = [...prev];
                    const last = next[next.length - 1];
                    if (last?.role === 'assistant') {
                        next[next.length - 1] = { ...last, content: last.content + delta };
                    }
                    return next;
                });
            });
        } catch (e) {
            if ((e as Error)?.name === 'AbortError') return; // user pressed Stop
            const msg = e instanceof AIError ? e.message : (e as Error)?.message ?? 'Something went wrong.';
            setError(msg);
            // Drop the empty assistant placeholder on hard failure.
            setMessages((prev) => {
                const next = [...prev];
                if (next[next.length - 1]?.role === 'assistant' && !next[next.length - 1].content) {
                    next.pop();
                }
                return next;
            });
        }
    };

    /** Build the running conversation as API messages, grounded in the chosen app. */
    const buildConversationMessages = (userText: string): ChatMessage[] => {
        const history: ChatMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));
        const system: ChatMessage = {
            role: 'system',
            content: contextApp
                ? `${SYSTEM_PROMPT}\n\nThe user has selected this application as context:\n\n${summarizeApplication(contextApp)}`
                : SYSTEM_PROMPT,
        };
        return [system, ...history, { role: 'user', content: userText }];
    };

    const handleSend = () => {
        const text = input.trim();
        if (!text || isGenerating) return;
        setInput('');
        run(buildConversationMessages(text), { user: text });
    };

    const handlePortfolioInsights = () =>
        run(buildPortfolioInsightsMessages(applications), {
            user: 'Analyze my application portfolio and tell me what needs attention.',
            label: 'Portfolio insights',
        });

    const handleNextSteps = () => {
        if (!contextApp) return;
        run(buildNextStepsMessages(contextApp), {
            user: `What are my next steps for ${contextApp.universityName}?`,
            label: 'Next steps',
        });
    };

    const handleFacultyEmail = () => {
        if (!contextApp) return;
        const faculty = facultyContacts.find((f) => String(f.id) === facultyId) ?? facultyContacts[0];
        if (!faculty) return;
        run(buildFacultyEmailMessages(contextApp, faculty), {
            user: `Draft an outreach email to ${faculty.name}.`,
            label: 'Faculty email',
        });
    };

    const handleEssayFeedback = () => {
        if (!contextApp) return;
        const text = input.trim();
        if (!text) {
            setError('Paste your essay/SOP text into the box below, then click Essay feedback.');
            return;
        }
        setInput('');
        run(buildEssayFeedbackMessages(contextApp, 'Statement of Purpose', text), {
            user: 'Give feedback on this essay draft.',
            label: 'Essay feedback',
        });
    };

    const handleClear = () => {
        if (isGenerating) stop();
        setMessages([]);
        setError(null);
    };

    const handleCopy = async (text: string, index: number) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedIndex(index);
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
            copyTimerRef.current = setTimeout(() => setCopiedIndex(null), 1500);
        } catch {
            setError('Could not copy to clipboard.');
        }
    };

    const selectClass =
        'text-sm rounded-lg border border-[#27272a] bg-[#09090b] py-1.5 pl-3 pr-8 text-[#f4f4f5] focus:outline-none focus:ring-2 focus:ring-[#C03050]';
    const chipClass =
        'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-[#E8B4B8]/30 text-[#F5D7DA] hover:bg-[#27272a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors';

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div
                        onClick={onClose}
                        className="fixed inset-0 liquid-glass-modal"
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    />

                    <motion.div
                        className="relative w-full max-w-3xl"
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <div className="liquid-glass-modal-content rounded-2xl overflow-hidden flex flex-col max-h-[85vh]">
                            <div className="p-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

                            {/* Header */}
                            <div className="px-6 pt-5 pb-3 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-[#F5D7DA] flex items-center gap-2">
                                    <MaterialIcon name="neurology" className="text-[#C03050]" />
                                    AI Assistant
                                    <span className="text-xs font-normal text-[#E8B4B8]/60 ml-1">
                                        {settings.provider === 'ollama' ? 'Ollama' : 'Local model'}
                                        {settings.model ? ` · ${settings.model}` : ''}
                                    </span>
                                </h3>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={handleClear}
                                        className="p-2 rounded-lg text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a] transition-colors"
                                        title="Clear conversation"
                                        aria-label="Clear conversation"
                                    >
                                        <MaterialIcon name="delete_sweep" className="text-lg" />
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-lg text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a] transition-colors"
                                        aria-label="Close"
                                    >
                                        <MaterialIcon name="close" className="text-lg" />
                                    </button>
                                </div>
                            </div>

                            {!isConfigured && (
                                <div className="mx-6 mb-3 rounded-lg border border-[#E8B4B8]/30 bg-[#27272a]/40 px-4 py-3 text-sm text-[#F5D7DA]">
                                    <p className="mb-2">
                                        {settings.enabled
                                            ? 'Pick a model to get started.'
                                            : 'AI features are off. Enable a local model (Ollama recommended) to use the assistant — all inference stays on your machine.'}
                                    </p>
                                    <button
                                        onClick={onOpenSettings}
                                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#C03050] text-white hover:bg-[#a02845] transition-colors"
                                    >
                                        Open AI settings
                                    </button>
                                </div>
                            )}

                            {/* Context bar */}
                            <div className="px-6 pb-3 flex flex-wrap items-center gap-2 border-b border-[#27272a]">
                                <label className="text-xs text-[#E8B4B8]/70">Context:</label>
                                <select
                                    value={contextAppId}
                                    onChange={(e) => {
                                        setContextAppId(e.target.value);
                                        setFacultyId('');
                                    }}
                                    className={selectClass}
                                    aria-label="Application context"
                                >
                                    <option value="">No specific application</option>
                                    {applications.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.universityName} — {a.programName}
                                        </option>
                                    ))}
                                </select>
                                {facultyContacts.length > 0 && (
                                    <select
                                        value={facultyId}
                                        onChange={(e) => setFacultyId(e.target.value)}
                                        className={selectClass}
                                        aria-label="Faculty contact"
                                    >
                                        {facultyContacts.map((f) => (
                                            <option key={String(f.id)} value={String(f.id)}>
                                                {f.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Quick actions */}
                            <div className="px-6 py-3 flex flex-wrap gap-2 border-b border-[#27272a]">
                                <button className={chipClass} onClick={handlePortfolioInsights} disabled={isGenerating || applications.length === 0}>
                                    <MaterialIcon name="insights" className="text-sm" /> Portfolio insights
                                </button>
                                <button className={chipClass} onClick={handleNextSteps} disabled={isGenerating || !contextApp}>
                                    <MaterialIcon name="checklist" className="text-sm" /> Next steps
                                </button>
                                <button className={chipClass} onClick={handleFacultyEmail} disabled={isGenerating || facultyContacts.length === 0}>
                                    <MaterialIcon name="mail" className="text-sm" /> Faculty email
                                </button>
                                <button className={chipClass} onClick={handleEssayFeedback} disabled={isGenerating || !contextApp}>
                                    <MaterialIcon name="rate_review" className="text-sm" /> Essay feedback
                                </button>
                            </div>

                            {/* Transcript */}
                            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-[180px]">
                                {messages.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-center text-[#E8B4B8]/60 py-8">
                                        <MaterialIcon name="auto_awesome" className="text-3xl mb-2 text-[#C03050]" />
                                        <p className="text-sm max-w-sm">
                                            Ask anything about your applications, or use a quick action above. Select an
                                            application as context for grounded, specific answers.
                                        </p>
                                    </div>
                                )}
                                {messages.map((m, i) => (
                                    <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                                        <div
                                            className={
                                                m.role === 'user'
                                                    ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-[#C03050] text-white px-4 py-2.5'
                                                    : 'max-w-[90%] rounded-2xl rounded-bl-sm bg-[#18181b] border border-[#27272a] px-4 py-2.5 text-[#F5D7DA]'
                                            }
                                        >
                                            {m.label && (
                                                <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">{m.label}</div>
                                            )}
                                            {m.role === 'assistant' ? (
                                                m.content ? (
                                                    <>
                                                        <div className="ai-markdown">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                                                        </div>
                                                        {!(isGenerating && i === messages.length - 1) && (
                                                            <button
                                                                onClick={() => handleCopy(m.content, i)}
                                                                className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#E8B4B8]/70 hover:text-[#F5D7DA] transition-colors"
                                                                aria-label="Copy response"
                                                            >
                                                                <MaterialIcon name={copiedIndex === i ? 'check' : 'content_copy'} className="text-xs" />
                                                                {copiedIndex === i ? 'Copied' : 'Copy'}
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="inline-flex items-center gap-2 text-[#E8B4B8]/70 text-sm">
                                                        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                                                        Thinking…
                                                    </span>
                                                )
                                            ) : (
                                                <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {error && (
                                <div className="mx-6 mb-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300 flex items-start gap-2">
                                    <MaterialIcon name="error" className="text-sm mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Composer */}
                            <div className="px-6 py-4 border-t border-[#27272a]">
                                <div className="flex items-end gap-2">
                                    <textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                        rows={2}
                                        placeholder="Ask a question, or paste an essay and click Essay feedback…"
                                        className="flex-1 resize-none rounded-xl bg-[#09090b] border border-[#27272a] px-3 py-2 text-sm text-[#F5D7DA] placeholder:text-[#E8B4B8]/40 focus:outline-none focus:ring-2 focus:ring-[#C03050]"
                                    />
                                    {isGenerating ? (
                                        <button
                                            onClick={stop}
                                            className="h-10 px-4 rounded-xl bg-[#27272a] text-[#F5D7DA] hover:bg-[#3f3f46] flex items-center gap-1.5 transition-colors"
                                        >
                                            <MaterialIcon name="stop" className="text-lg" /> Stop
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleSend}
                                            disabled={!input.trim()}
                                            className="h-10 px-4 rounded-xl bg-[#C03050] text-white hover:bg-[#a02845] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                                        >
                                            <MaterialIcon name="send" className="text-lg" /> Send
                                        </button>
                                    )}
                                </div>
                                <p className="mt-2 text-[10px] text-[#E8B4B8]/50 flex items-center gap-1">
                                    <MaterialIcon name="lock" className="text-xs" />
                                    Runs on your configured local model — your data stays on your machine.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AIAssistantModal;
