import { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { CustomFieldDefinition } from '../types';

export const useCustomFields = () => {
    const [customFields, setCustomFields] = useLocalStorage<CustomFieldDefinition[]>('custom-field-definitions', []);

    const addField = useCallback((field: Omit<CustomFieldDefinition, 'id'>) => {
        const newField: CustomFieldDefinition = {
            ...field,
            id: crypto.randomUUID(),
        };
        setCustomFields(prev => [...prev, newField]);
        return newField.id;
    }, [setCustomFields]);

    const updateField = useCallback((id: string, updates: Partial<CustomFieldDefinition>) => {
        setCustomFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    }, [setCustomFields]);

    const deleteField = useCallback((id: string) => {
        setCustomFields(prev => prev.filter(f => f.id !== id));
    }, [setCustomFields]);

    return {
        customFields,
        addField,
        updateField,
        deleteField,
    };
};
