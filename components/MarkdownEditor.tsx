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
                <label className="block text-sm font-medium text-[#f4f4f5]">
                    {label}
                </label>
                <button
                    type="button"
                    onClick={() => setIsPreview(!isPreview)}
                    className="text-xs font-medium text-[#a1a1aa] hover:text-[#f4f4f5] transition-colors"
                >
                    {isPreview ? 'Edit' : 'Preview'}
                </button>
            </div>

            <div className="relative min-h-[150px] w-full rounded-lg border border-[#27272a] liquid-glass overflow-hidden focus-within:ring-2 focus-within:ring-[#dc2626] focus-within:border-[#27272a] transition">
                {isPreview ? (
                    <div className="ai-markdown max-h-[300px] overflow-y-auto custom-scrollbar p-3">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{value || '*No notes yet*'}</ReactMarkdown>
                    </div>
                ) : (
                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full h-full min-h-[150px] p-3 bg-transparent border-none resize-y focus:ring-0 text-sm text-[#f4f4f5] placeholder:text-[#a1a1aa]/50"
                        placeholder="Type your notes here... (Markdown supported)"
                    />
                )}
            </div>
            <p className="text-xs text-[#a1a1aa]/50">
                Supports Markdown: **bold**, *italic*, - lists, [links](url)
            </p>
        </div>
    );
};

export default MarkdownEditor;
