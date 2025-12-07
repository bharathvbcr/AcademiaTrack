import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

type Theme = 'light' | 'dark' | 'system';

export const useDarkMode = () => {
    const [theme, setTheme] = useLocalStorage<Theme>('theme-preference', 'system');
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        const root = window.document.documentElement;

        const getSystemTheme = () => {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        };

        const applyTheme = () => {
            let shouldBeDark: boolean;

            if (theme === 'system') {
                shouldBeDark = getSystemTheme();
            } else {
                shouldBeDark = theme === 'dark';
            }

            setIsDarkMode(shouldBeDark);

            if (shouldBeDark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        };

        applyTheme();

        // Listen for system theme changes when in 'system' mode
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            if (theme === 'system') {
                applyTheme();
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    const toggleTheme = () => {
        if (theme === 'system') {
            setTheme(isDarkMode ? 'light' : 'dark');
        } else if (theme === 'dark') {
            setTheme('light');
        } else {
            setTheme('dark');
        }
    };

    const cycleTheme = () => {
        if (theme === 'system') {
            setTheme('light');
        } else if (theme === 'light') {
            setTheme('dark');
        } else {
            setTheme('system');
        }
    };

    return {
        theme,
        setTheme,
        isDarkMode,
        toggleTheme,
        cycleTheme,
    };
};
