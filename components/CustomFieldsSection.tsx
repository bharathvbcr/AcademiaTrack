import React, { useMemo } from 'react';
import { Application, CustomFieldDefinition } from '../types';
import { useCustomFields } from '../hooks/useCustomFields';

interface CustomFieldsSectionProps {
    appData: Application;
    handleCustomFieldChange: (fieldId: string, value: string | number | boolean) => void;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

// Calculate value for calculated fields
const calculateFieldValue = (field: CustomFieldDefinition, app: Application): string | number | boolean => {
    if (!field.calculatedFormula) return '';

    try {
        const formula = field.calculatedFormula.toLowerCase();

        // Days until deadline
        if (formula.includes('deadline') && formula.includes('days')) {
            if (app.deadline) {
                const deadline = new Date(app.deadline);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                deadline.setHours(0, 0, 0, 0);
                const diffTime = deadline.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays;
            }
            return 0;
        }

        // Days since submitted
        if (formula.includes('submitted') && formula.includes('days')) {
            const submittedDate = app.statusHistory?.find(s => s.status === 'Submitted')?.timestamp;
            if (submittedDate) {
                const submitted = new Date(submittedDate);
                const today = new Date();
                const diffTime = today.getTime() - submitted.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                return diffDays;
            }
            return 0;
        }

        // Application fee with percentage
        if (formula.includes('fee') && formula.includes('%')) {
            const match = formula.match(/(\d+(?:\.\d+)?)/);
            if (match && app.applicationFee) {
                const percentage = parseFloat(match[1]);
                return app.applicationFee * (percentage / 100);
            }
        }

        // Total cost (fee + tests)
        if (formula.includes('total') && formula.includes('cost')) {
            let total = app.applicationFee || 0;
            if (app.englishTest?.cost) total += app.englishTest.cost;
            if (app.gre?.cost) total += app.gre.cost;
            return total;
        }

        return '';
    } catch (error) {
        console.error('Error calculating field value:', error);
        return '';
    }
};

const CustomFieldsSection: React.FC<CustomFieldsSectionProps> = ({ appData, handleCustomFieldChange }) => {
    const { visibleFields } = useCustomFields();

    if (visibleFields.length === 0) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Custom Fields</h3>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {visibleFields.map(field => {
                    // For calculated fields, compute the value; otherwise use stored value
                    const value = field.type === 'calculated'
                        ? calculateFieldValue(field, appData)
                        : (appData.customFields?.[field.id] ?? '');

                    // Calculated fields are read-only
                    const isReadOnly = field.type === 'calculated';

                    const fieldId = `custom-field-${field.id}`;

                    return (
                        <div key={field.id}>
                            <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                {field.name}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                                {field.type === 'calculated' && (
                                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                                        <MaterialIcon name="calculate" className="text-xs align-middle" />
                                    </span>
                                )}
                            </label>

                            {field.type === 'calculated' && (
                                <div className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300">
                                    {typeof value === 'number' ? value.toLocaleString() : String(value)}
                                </div>
                            )}

                            {field.type === 'text' && (
                                <input
                                    id={fieldId}
                                    type="text"
                                    value={value as string}
                                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                    className="w-full px-4 py-2 liquid-glass-input border border-[#27272a] bg-[#18181b] rounded-lg focus:ring-2 focus:ring-[#dc2626] focus:border-transparent transition-all text-[#f4f4f5] placeholder:text-[#a1a1aa]/50"
                                    placeholder={field.placeholder}
                                    readOnly={isReadOnly}
                                    disabled={isReadOnly}
                                />
                            )}

                            {field.type === 'number' && (
                                <input
                                    id={fieldId}
                                    type="number"
                                    value={value as string | number}
                                    onChange={(e) => handleCustomFieldChange(field.id, parseFloat(e.target.value))}
                                    className="w-full px-4 py-2 liquid-glass-input border border-[#27272a] bg-[#18181b] rounded-lg focus:ring-2 focus:ring-[#dc2626] focus:border-transparent transition-all text-[#f4f4f5] placeholder:text-[#a1a1aa]/50"
                                    placeholder={field.placeholder}
                                />
                            )}

                            {field.type === 'boolean' && (
                                <div className="flex items-center h-[42px]">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            id={fieldId}
                                            type="checkbox"
                                            checked={!!value}
                                            onChange={(e) => handleCustomFieldChange(field.id, e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                                        <span className="ml-3 text-sm font-medium text-slate-900 dark:text-slate-300">
                                            {!!value ? 'Yes' : 'No'}
                                        </span>
                                    </label>
                                </div>
                            )}

                            {field.type === 'date' && (
                                <input
                                    id={fieldId}
                                    type="date"
                                    value={value as string}
                                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                    className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                />
                            )}

                            {field.type === 'select' && (
                                <select
                                    id={fieldId}
                                    value={value as string}
                                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                    className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                >
                                    <option value="">Select option</option>
                                    {field.options?.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CustomFieldsSection;
