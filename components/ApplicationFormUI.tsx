import React from 'react';

export const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

export const FieldSet: React.FC<{ legend: string; children: React.ReactNode; }> = ({ legend, children }) => (
    <fieldset>
        <legend className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">{legend}</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </fieldset>
);

const baseInputClasses = "w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition disabled:bg-slate-100 dark:disabled:bg-slate-800";
const errorInputClasses = "border-red-500 focus:ring-red-500 focus:border-red-500";

interface BaseFieldProps {
    label: string;
    error?: string;
}

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & BaseFieldProps> = ({ label, className, error, ...props }) => (
    <div className={className}>
        <label htmlFor={props.name} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
        <input {...props} id={props.name} className={`${baseInputClasses} ${error ? errorInputClasses : ''}`} />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & BaseFieldProps> = ({ label, children, className, error, ...props }) => (
    <div className={className}>
        <label htmlFor={props.name} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
        <select {...props} id={props.name} className={`${baseInputClasses} ${error ? errorInputClasses : ''}`}>{children}</select>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
);

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & BaseFieldProps> = ({ label, className, error, ...props }) => (
    <div className={className}>
        <label htmlFor={props.name} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
        <textarea {...props} id={props.name} className={`${baseInputClasses} ${error ? errorInputClasses : ''}`} />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
);
