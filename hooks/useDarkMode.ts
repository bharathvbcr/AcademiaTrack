import { useEffect } from 'react';

// Always dark mode, no theme switching
export const useDarkMode = () => {
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.add('dark');
    }, []);

    return {
        isDarkMode: true,
    };
};
