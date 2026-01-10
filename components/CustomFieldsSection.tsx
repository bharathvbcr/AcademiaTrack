import React from 'react';
import { Application, CustomFieldDefinition } from '../types';
import { useCustomFields } from '../hooks/useCustomFields';

interface CustomFieldsSectionProps {
    appData: Application;
    handleCustomFieldChange: (fieldId: string, value: string | number | boolean) => void;
}

const CustomFieldsSection: React.FC<CustomFieldsSectionProps> = ({ appData, handleCustomFieldChange }) => {
    const { customFields } = useCustomFields();

    if (customFields.length === 0) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Custom Fields</h3>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {customFields.map(field => {
                    const value = appData.customFields?.[field.id] ?? '';

                    return (
                        <div key={field.id}>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                {field.name}
                            </label>

                            {field.type === 'text' && (
                                <input
                                    type="text"
                                    value={value as string}
                                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                    className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                    placeholder={field.placeholder}
                                />
                            )}

                            {field.type === 'number' && (
                                <input
                                    type="number"
                                    value={value as string | number}
                                    onChange={(e) => handleCustomFieldChange(field.id, parseFloat(e.target.value))}
                                    className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                    placeholder={field.placeholder}
                                />
                            )}

                            {field.type === 'boolean' && (
                                <div className="flex items-center h-[42px]">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
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
                                    type="date"
                                    value={value as string}
                                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                    className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                />
                            )}

                            {field.type === 'select' && (
                                <select
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
