import { useEffect } from 'react';

export const useKeyboardShortcuts = (shortcuts: { [key: string]: () => void }) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ignore if typing in an input or textarea
            if (
                document.activeElement instanceof HTMLInputElement ||
                document.activeElement instanceof HTMLTextAreaElement
            ) {
                return;
            }

            const key = event.key.toLowerCase();
            const ctrl = event.ctrlKey || event.metaKey; // Support Cmd on Mac

            if (ctrl) {
                if (shortcuts[`Ctrl+${key}`]) {
                    event.preventDefault();
                    shortcuts[`Ctrl+${key}`]();
                }
            } else {
                if (shortcuts[key]) {
                    shortcuts[key]();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
};
