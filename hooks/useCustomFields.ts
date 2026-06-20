import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { CustomFieldDefinition } from '../types';

export const useCustomFields = () => {
    const [customFields, setCustomFields] = useLocalStorage<CustomFieldDefinition[]>('custom-field-definitions', []);

    // Get visible fields sorted by order
    const visibleFields = useMemo(() => {
        return customFields
            .filter(field => field.visible !== false)
            .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    }, [customFields]);

    const addField = useCallback((field: Omit<CustomFieldDefinition, 'id'>) => {
        const newId = crypto.randomUUID();
        setCustomFields(prev => {
            const maxOrder = prev.reduce((max, f) => Math.max(max, f.order ?? 0), 0);
            const newField: CustomFieldDefinition = {
                ...field,
                id: newId,
                visible: field.visible !== false,
                order: field.order ?? maxOrder + 1,
            };
            return [...prev, newField];
        });
        return newId;
    }, [setCustomFields]);

    const updateField = useCallback((id: string, updates: Partial<CustomFieldDefinition>) => {
        setCustomFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    }, [setCustomFields]);

    const deleteField = useCallback((id: string) => {
        setCustomFields(prev => prev.filter(f => f.id !== id));
    }, [setCustomFields]);

    const reorderFields = useCallback((fieldIds: string[]) => {
        setCustomFields(prev => {
            const fieldMap = new Map(prev.map(f => [f.id, f]));
            const reordered: CustomFieldDefinition[] = [];
            fieldIds.forEach((id, index) => {
                const field = fieldMap.get(id);
                if (field) {
                    reordered.push({ ...field, order: index });
                }
            });
            return reordered;
        });
    }, [setCustomFields]);

    const toggleFieldVisibility = useCallback((id: string) => {
        setCustomFields(prev => prev.map(f => 
            f.id === id ? { ...f, visible: !(f.visible !== false) } : f
        ));
    }, [setCustomFields]);

    return {
        customFields,
        visibleFields,
        addField,
        updateField,
        deleteField,
        reorderFields,
        toggleFieldVisibility,
    };
};
