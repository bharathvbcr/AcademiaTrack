import { useState, useCallback } from 'react';

interface ConfirmationState {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
}

export const useConfirmation = () => {
    const [confirmation, setConfirmation] = useState<ConfirmationState>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    const closeConfirmation = useCallback(() => {
        setConfirmation(prev => ({ ...prev, isOpen: false }));
    }, []);

    const showConfirmation = useCallback((
        title: string,
        message: string,
        onConfirm: () => void,
        isDanger?: boolean
    ) => {
        setConfirmation({
            isOpen: true,
            title,
            message,
            onConfirm,
            isDanger
        });
    }, []);

    return {
        confirmation,
        closeConfirmation,
        showConfirmation
    };
};
