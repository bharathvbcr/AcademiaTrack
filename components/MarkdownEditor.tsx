import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    label: string;
    className?: string;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, label, className }) => {
    const [isPreview, setIsPreview] = useState(false);

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {label}
                </label>
                <button
                    type="button"
                    onClick={() => setIsPreview(!isPreview)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                    {isPreview ? 'Edit' : 'Preview'}
                </button>
            </div>

            <div className="relative min-h-[150px] w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 overflow-hidden focus-within:ring-1 focus-within:ring-red-500 focus-within:border-red-500 transition">
                {isPreview ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none p-3 overflow-y-auto max-h-[300px]">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{value || '*No notes yet*'}</ReactMarkdown>
                    </div>
                ) : (
                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full h-full min-h-[150px] p-3 bg-transparent border-none resize-y focus:ring-0 text-sm text-slate-800 dark:text-slate-200"
                        placeholder="Type your notes here... (Markdown supported)"
                    />
                )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
                Supports Markdown: **bold**, *italic*, - lists, [links](url)
            </p>
        </div>
    );
};

export default MarkdownEditor;
