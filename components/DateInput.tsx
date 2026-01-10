import React from 'react';

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
<span className={`material-symbols-outlined ${className}`}>{name}</span>
);

interface DateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  containerClassName?: string;
}

const DateInput: React.FC<DateInputProps> = ({ label, containerClassName, ...props }) => {
  return (
    <div className={containerClassName}>
      <label htmlFor={props.name} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <MaterialIcon name="calendar_today" className="text-slate-400" />
        </div>
        <input 
          {...props} 
          id={props.name} 
          type="date"
          className="w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition [color-scheme:light_dark]"
        />
      </div>
    </div>
  );
};

export default DateInput;