import React from 'react';
import { MaterialIcon, formInputClass } from './ApplicationFormUI';

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
          className={`${formInputClass} pl-10 [color-scheme:dark] focus:ring-offset-2 focus:ring-offset-[#09090b]`}
        />
      </div>
    </div>
  );
};

export default DateInput;