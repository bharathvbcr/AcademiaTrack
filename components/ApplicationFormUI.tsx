import React from 'react';

export const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

export const FieldSet: React.FC<{ legend: string; children: React.ReactNode; }> = ({ legend, children }) => (
    <fieldset>
        <legend className="text-lg font-semibold text-[#f4f4f5] mb-4">{legend}</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </fieldset>
);

const baseInputClasses = "w-full px-3 py-2 liquid-glass-input border border-[#27272a] bg-[#18181b] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:border-transparent transition text-[#f4f4f5] placeholder:text-[#a1a1aa]/50 disabled:opacity-50";
const errorInputClasses = "border-[#dc2626] focus:ring-[#dc2626] focus:border-[#dc2626]";

interface BaseFieldProps {
    label: string;
    error?: string;
}

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & BaseFieldProps> = ({ label, className, error, ...props }) => (
    <div className={className}>
        <label htmlFor={props.name} className="block text-sm font-medium text-[#a1a1aa] mb-1.5">{label}</label>
        <input {...props} id={props.name} className={`${baseInputClasses} ${error ? errorInputClasses : ''}`} />
        {error && <p className="mt-1 text-sm text-[#dc2626]">{error}</p>}
    </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & BaseFieldProps> = ({ label, children, className, error, name, ...props }) => {
    const selectId = name || `select-${Math.random().toString(36).substr(2, 9)}`;
    const labelId = `label-${selectId}`;
    return (
        <div className={className}>
            <label id={labelId} htmlFor={selectId} className="block text-sm font-medium text-[#a1a1aa] mb-1.5">{label}</label>
            <select {...props} name={name} id={selectId} aria-labelledby={labelId} aria-label={label} title={label} className={`${baseInputClasses} ${error ? errorInputClasses : ''}`}>{children}</select>
            {error && <p className="mt-1 text-sm text-[#dc2626]">{error}</p>}
        </div>
    );
};

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & BaseFieldProps> = ({ label, className, error, ...props }) => (
    <div className={className}>
        <label htmlFor={props.name} className="block text-sm font-medium text-[#a1a1aa] mb-1.5">{label}</label>
        <textarea {...props} id={props.name} className={`${baseInputClasses} ${error ? errorInputClasses : ''}`} />
        {error && <p className="mt-1 text-sm text-[#dc2626]">{error}</p>}
    </div>
);
