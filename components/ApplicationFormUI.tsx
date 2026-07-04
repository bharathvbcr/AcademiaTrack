import React from 'react';

export interface MaterialIconProps {
    name: string;
    className?: string;
    'aria-hidden'?: boolean | 'true' | 'false';
}

export const MaterialIcon: React.FC<MaterialIconProps> = ({ name, className, 'aria-hidden': ariaHidden }) => (
    <span className={`material-symbols-outlined ${className ?? ''}`} aria-hidden={ariaHidden}>{name}</span>
);

export const FieldSet: React.FC<{ legend: string; children: React.ReactNode; }> = ({ legend, children }) => (
    <fieldset>
        <legend className="text-lg font-semibold text-[#f4f4f5] mb-4">{legend}</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </fieldset>
);

const baseInputClasses = "w-full px-3 py-2 liquid-glass-input border border-[#27272a] bg-[#18181b] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:border-transparent transition text-[#f4f4f5] placeholder:text-[#a1a1aa]/50 disabled:opacity-50";
const errorInputClasses = "border-[#dc2626] focus:ring-[#dc2626] focus:border-[#dc2626]";

/** Shared dark-theme form primitives for modal sections. */
export const formInputClass = baseInputClasses;
export const formInputSmClass = "w-full px-3 py-1.5 text-sm liquid-glass-input border border-[#27272a] bg-[#18181b] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#dc2626] text-[#f4f4f5] placeholder:text-[#a1a1aa]/50";
/** Width-flexible input for inline filter rows and compact controls. */
export const formInlineInputClass = "px-3 py-2 liquid-glass-input border border-[#27272a] bg-[#18181b] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:border-transparent transition text-[#f4f4f5] placeholder:text-[#a1a1aa]/50 disabled:opacity-50";
export const formInlineInputSmClass = "px-3 py-1.5 text-sm liquid-glass-input border border-[#27272a] bg-[#18181b] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#dc2626] text-[#f4f4f5] placeholder:text-[#a1a1aa]/50";
export const formCardClass = "rounded-lg border border-[#27272a] bg-[#18181b]";
export const formCardMutedClass = "rounded-lg border border-[#27272a] bg-[#09090b]";
export const formSectionDivider = "border-t border-[#27272a]";
export const formSubheadingClass = "text-sm font-semibold text-[#f4f4f5] mb-3 flex items-center gap-2";
export const formLabelUpperClass = "block text-xs font-medium text-[#a1a1aa] uppercase mb-1";
export const formSectionTitleClass = "text-lg font-semibold text-[#f4f4f5]";
export const formMutedTextClass = "text-[#a1a1aa]";
export const formActionBtnClass = "px-3 py-1.5 text-sm bg-[#27272a] text-[#f4f4f5] rounded-lg hover:bg-[#3f3f46] disabled:opacity-50 transition-colors";
export const formPrimaryBtnClass = "px-4 py-2 bg-[#dc2626] text-white rounded-lg hover:bg-[#b91c1c] disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:ring-offset-2 focus:ring-offset-[#09090b]";
export const formSecondaryBtnClass = "px-4 py-2 border border-[#27272a] text-[#f4f4f5] rounded-lg hover:bg-[#27272a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:ring-offset-2 focus:ring-offset-[#09090b]";
export const formToggleTrackClass = "w-11 h-6 bg-[#27272a] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#dc2626] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#dc2626]";
export const formCheckboxClass = "h-4 w-4 rounded border-[#3f3f46] text-[#dc2626] focus:ring-[#dc2626] bg-[#18181b]";
export const formDashedAddClass = "w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-[#a1a1aa] border-2 border-dashed border-[#27272a] rounded-lg hover:bg-[#27272a] hover:border-[#3f3f46] hover:text-[#f4f4f5] transition-colors";
export const formInfoBoxClass = "p-4 rounded-lg border border-[#27272a] bg-[#27272a]/40 text-sm text-[#a1a1aa]";
export const formIconBtnClass = "p-2 hover:bg-[#27272a] rounded-lg text-[#a1a1aa] hover:text-[#f4f4f5] transition-colors";
export const formToggleBlueClass = "w-11 h-6 bg-[#27272a] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600";

interface ToggleSwitchProps {
    id?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    accent?: 'red' | 'blue';
    className?: string;
    'aria-label'?: string;
}

/** Accessible toggle reused across settings and config modals. */
export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
    id,
    checked,
    onChange,
    label,
    accent = 'red',
    className = '',
    'aria-label': ariaLabel,
}) => {
    const trackClass = accent === 'blue' ? formToggleBlueClass : formToggleTrackClass;
    return (
        <label className={`relative inline-flex items-center cursor-pointer ${className}`}>
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="sr-only peer"
                aria-label={ariaLabel}
            />
            <div className={trackClass} />
            {label && <span className="ml-3 text-sm font-medium text-[#f4f4f5]">{label}</span>}
        </label>
    );
};

interface BaseFieldProps {
    label: string;
    error?: string;
}

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & BaseFieldProps> = ({ label, className, error, ...props }) => {
    const errorId = props.name ? `${props.name}-error` : undefined;
    return (
        <div className={className}>
            <label htmlFor={props.name} className="block text-sm font-medium text-[#a1a1aa] mb-1.5">{label}</label>
            <input {...props} id={props.name} aria-invalid={error ? true : undefined} aria-describedby={error && errorId ? errorId : undefined} className={`${baseInputClasses} ${error ? errorInputClasses : ''}`} />
            {error && <p id={errorId} className="mt-1 text-sm text-[#dc2626]">{error}</p>}
        </div>
    );
};

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & BaseFieldProps> = ({ label, children, className, error, name, ...props }) => {
    const selectId = name || `select-${Math.random().toString(36).substr(2, 9)}`;
    const labelId = `label-${selectId}`;
    return (
        <div className={className}>
            <label id={labelId} htmlFor={selectId} className="block text-sm font-medium text-[#a1a1aa] mb-1.5">{label}</label>
            <select {...props} name={name} id={selectId} aria-labelledby={labelId} aria-label={label} title={label} aria-invalid={error ? true : undefined} aria-describedby={error ? `${selectId}-error` : undefined} className={`${baseInputClasses} ${error ? errorInputClasses : ''}`}>{children}</select>
            {error && <p id={`${selectId}-error`} className="mt-1 text-sm text-[#dc2626]">{error}</p>}
        </div>
    );
};

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & BaseFieldProps> = ({ label, className, error, ...props }) => {
    const errorId = props.name ? `${props.name}-error` : undefined;
    return (
        <div className={className}>
            <label htmlFor={props.name} className="block text-sm font-medium text-[#a1a1aa] mb-1.5">{label}</label>
            <textarea {...props} id={props.name} aria-invalid={error ? true : undefined} aria-describedby={error && errorId ? errorId : undefined} className={`${baseInputClasses} ${error ? errorInputClasses : ''}`} />
            {error && <p id={errorId} className="mt-1 text-sm text-[#dc2626]">{error}</p>}
        </div>
    );
};
