import { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  border: string;
}

export interface CustomTheme {
  id: string;
  name: string;
  colors: ThemeColors;
  fontFamily?: string;
  fontSize?: 'small' | 'medium' | 'large';
  density?: 'compact' | 'comfortable' | 'spacious';
}

// Canonical zinc + red "Minimal Dark" palette — matches the tokens in
// index.html :root. (Note: these --theme-* variables are currently applied to
// <html> for forward-compatibility but no component consumes them yet; keeping
// the defaults correct avoids leaking a stale crimson palette into the DOM.)
const defaultThemes: CustomTheme[] = [
  {
    id: 'default',
    name: 'Minimal Dark',
    colors: {
      primary: '#dc2626',    // red 600 — accent
      secondary: '#b91c1c',  // red 700 — accent hover
      accent: '#a1a1aa',     // zinc 400 — secondary text
      background: '#09090b',  // zinc 950 — app background
      surface: '#18181b',    // zinc 900 — cards / surfaces
      text: '#f4f4f5',       // zinc 100 — primary text
      border: '#27272a',     // zinc 800 — borders
    },
  },
  {
    id: 'dark-default',
    name: 'Minimal Dark (High Contrast)',
    colors: {
      primary: '#ef4444',    // red 500
      secondary: '#dc2626',  // red 600
      accent: '#d4d4d8',     // zinc 300
      background: '#09090b',  // zinc 950
      surface: '#18181b',    // zinc 900
      text: '#fafafa',       // zinc 50
      border: '#3f3f46',     // zinc 700
    },
  },
];

export const useThemeCustomization = () => {
  const [customThemes, setCustomThemes] = useLocalStorage<CustomTheme[]>('custom-themes', defaultThemes);
  const [activeThemeId, setActiveThemeId] = useLocalStorage<string>('active-theme-id', 'default');
  const [fontSize, setFontSize] = useLocalStorage<'small' | 'medium' | 'large'>('font-size', 'medium');
  const [fontFamily, setFontFamily] = useLocalStorage<string>('font-family', 'system');
  const [density, setDensity] = useLocalStorage<'compact' | 'comfortable' | 'spacious'>('view-density', 'comfortable');

  const activeTheme = customThemes.find(t => t.id === activeThemeId) || customThemes[0];

  const createTheme = useCallback((name: string, colors: ThemeColors) => {
    const newTheme: CustomTheme = {
      id: crypto.randomUUID(),
      name,
      colors,
      fontFamily,
      fontSize,
      density,
    };
    setCustomThemes(prev => [...prev, newTheme]);
    return newTheme.id;
  }, [fontFamily, fontSize, density, setCustomThemes]);

  const updateTheme = useCallback((id: string, updates: Partial<CustomTheme>) => {
    setCustomThemes(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, [setCustomThemes]);

  const deleteTheme = useCallback((id: string) => {
    if (id === 'default' || id === 'dark-default') return; // Can't delete default themes
    setCustomThemes(prev => prev.filter(t => t.id !== id));
    if (activeThemeId === id) {
      setActiveThemeId('default');
    }
  }, [setCustomThemes, activeThemeId, setActiveThemeId]);

  const applyTheme = useCallback((theme: CustomTheme) => {
    const root = document.documentElement;
    
    // Apply CSS variables
    root.style.setProperty('--theme-primary', theme.colors.primary);
    root.style.setProperty('--theme-secondary', theme.colors.secondary);
    root.style.setProperty('--theme-accent', theme.colors.accent);
    root.style.setProperty('--theme-background', theme.colors.background);
    root.style.setProperty('--theme-surface', theme.colors.surface);
    root.style.setProperty('--theme-text', theme.colors.text);
    root.style.setProperty('--theme-border', theme.colors.border);

    if (theme.fontFamily) {
      root.style.setProperty('--font-family', theme.fontFamily);
    }

    if (theme.fontSize) {
      const sizes = {
        small: '0.875rem',
        medium: '1rem',
        large: '1.125rem',
      };
      root.style.setProperty('--base-font-size', sizes[theme.fontSize]);
    }

    if (theme.density) {
      const densities = {
        compact: '0.5rem',
        comfortable: '1rem',
        spacious: '1.5rem',
      };
      root.style.setProperty('--spacing-unit', densities[theme.density]);
    }
  }, []);

  const applyActiveTheme = useCallback(() => {
    const theme = customThemes.find(t => t.id === activeThemeId) || customThemes[0];
    if (theme) {
      applyTheme({ ...theme, fontSize, fontFamily, density });
    }
  }, [activeThemeId, customThemes, fontSize, fontFamily, density, applyTheme]);

  return {
    customThemes,
    activeTheme,
    activeThemeId,
    fontSize,
    fontFamily,
    density,
    setActiveThemeId,
    setFontSize,
    setFontFamily,
    setDensity,
    createTheme,
    updateTheme,
    deleteTheme,
    applyTheme,
    applyActiveTheme,
  };
};
