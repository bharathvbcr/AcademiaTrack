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
      <label htmlFor={props.name} className="block text-sm font-medium text-[#a1a1aa] mb-1.5">{label}</label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <MaterialIcon name="calendar_today" className="text-[#a1a1aa]" />
        </div>
        <input
          {...props}
          id={props.name}
          type="date"
          className="w-full pl-10 pr-3 py-2 liquid-glass-input border border-[#27272a] bg-[#18181b] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:border-transparent transition text-[#f4f4f5] [color-scheme:dark]"
        />
      </div>
    </div>
  );
};

export default DateInput;