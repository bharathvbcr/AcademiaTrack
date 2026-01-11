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
                <label className="block text-sm font-medium text-[#F5D7DA]">
                    {label}
                </label>
                <button
                    type="button"
                    onClick={() => setIsPreview(!isPreview)}
                    className="text-xs font-medium text-[#E8B4B8] hover:text-[#F5D7DA] transition-colors"
                >
                    {isPreview ? 'Edit' : 'Preview'}
                </button>
            </div>

            <div className="relative min-h-[150px] w-full rounded-lg border border-[#E8B4B8]/30 liquid-glass overflow-hidden focus-within:ring-2 focus-within:ring-[#E8B4B8] focus-within:border-[#E8B4B8] transition">
                {isPreview ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none p-3 overflow-y-auto max-h-[300px] text-[#F5D7DA]">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{value || '*No notes yet*'}</ReactMarkdown>
                    </div>
                ) : (
                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full h-full min-h-[150px] p-3 bg-transparent border-none resize-y focus:ring-0 text-sm text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                        placeholder="Type your notes here... (Markdown supported)"
                    />
                )}
            </div>
            <p className="text-xs text-[#E8B4B8]/50">
                Supports Markdown: **bold**, *italic*, - lists, [links](url)
            </p>
        </div>
    );
};

export default MarkdownEditor;
