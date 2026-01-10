import { useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export type ShortcutAction =
  | 'new-application'
  | 'open-command-palette'
  | 'save'
  | 'delete'
  | 'duplicate'
  | 'undo'
  | 'redo'
  | 'next-application'
  | 'previous-application'
  | 'focus-search'
  | 'toggle-selection-mode'
  | 'select-all'
  | 'clear-selection'
  | 'view-list'
  | 'view-kanban'
  | 'view-calendar'
  | 'view-timeline'
  | 'view-budget'
  | 'view-faculty'
  | 'view-recommenders'
  | 'export-csv'
  | 'export-json'
  | 'close-modal'
  | 'export-json'
  | 'close-modal'
  | 'toggle-theme'
  | 'quick-capture';

export interface KeyboardShortcut {
  id: string;
  action: ShortcutAction;
  keys: string; // e.g., "Ctrl+N", "Cmd+K"
  description: string;
  category: 'navigation' | 'actions' | 'views' | 'selection' | 'modals';
  global?: boolean; // Works even when modals are open
}

const defaultShortcuts: KeyboardShortcut[] = [
  { id: 'new-app', action: 'new-application', keys: 'Ctrl+N', description: 'New Application', category: 'actions', global: true },
  { id: 'cmd-palette', action: 'open-command-palette', keys: 'Ctrl+K', description: 'Command Palette', category: 'navigation', global: true },
  { id: 'save', action: 'save', keys: 'Ctrl+S', description: 'Save', category: 'actions' },
  { id: 'delete', action: 'delete', keys: 'Delete', description: 'Delete', category: 'actions' },
  { id: 'duplicate', action: 'duplicate', keys: 'Ctrl+D', description: 'Duplicate', category: 'actions' },
  { id: 'undo', action: 'undo', keys: 'Ctrl+Z', description: 'Undo', category: 'actions', global: true },
  { id: 'redo', action: 'redo', keys: 'Ctrl+Y', description: 'Redo', category: 'actions', global: true },
  { id: 'next', action: 'next-application', keys: 'Ctrl+J', description: 'Next Application', category: 'navigation' },
  { id: 'prev', action: 'previous-application', keys: 'Ctrl+K', description: 'Previous Application', category: 'navigation' },
  { id: 'focus-search', action: 'focus-search', keys: '/', description: 'Focus Search', category: 'navigation', global: true },
  { id: 'toggle-select', action: 'toggle-selection-mode', keys: 'Ctrl+Shift+S', description: 'Toggle Selection Mode', category: 'selection' },
  { id: 'select-all', action: 'select-all', keys: 'Ctrl+A', description: 'Select All', category: 'selection' },
  { id: 'clear-selection', action: 'clear-selection', keys: 'Escape', description: 'Clear Selection', category: 'selection' },
  { id: 'view-list', action: 'view-list', keys: 'Ctrl+1', description: 'List View', category: 'views', global: true },
  { id: 'view-kanban', action: 'view-kanban', keys: 'Ctrl+2', description: 'Kanban View', category: 'views', global: true },
  { id: 'view-calendar', action: 'view-calendar', keys: 'Ctrl+3', description: 'Calendar View', category: 'views', global: true },
  { id: 'view-budget', action: 'view-budget', keys: 'Ctrl+4', description: 'Budget View', category: 'views', global: true },
  { id: 'view-faculty', action: 'view-faculty', keys: 'Ctrl+5', description: 'Faculty View', category: 'views', global: true },
  { id: 'view-recommenders', action: 'view-recommenders', keys: 'Ctrl+6', description: 'Recommenders View', category: 'views', global: true },
  { id: 'view-timeline', action: 'view-timeline', keys: 'Ctrl+7', description: 'Timeline View', category: 'views', global: true },
  { id: 'close-modal', action: 'close-modal', keys: 'Escape', description: 'Close Modal', category: 'modals' },
  { id: 'toggle-theme', action: 'toggle-theme', keys: 'Ctrl+Shift+T', description: 'Toggle Theme', category: 'actions', global: true },
  { id: 'quick-capture', action: 'quick-capture', keys: 'Ctrl+Shift+C', description: 'Quick Capture', category: 'actions', global: true },
];

export const useEnhancedKeyboardShortcuts = (
  handlers: Partial<Record<ShortcutAction, () => void>>,
  options?: { enabled?: boolean; ignoreInputs?: boolean }
) => {
  const [customShortcuts, setCustomShortcuts] = useLocalStorage<KeyboardShortcut[]>('custom-keyboard-shortcuts', []);
  const [enabled, setEnabled] = useLocalStorage<boolean>('keyboard-shortcuts-enabled', true);

  const allShortcuts = useCallback(() => {
    const merged = [...defaultShortcuts];
    customShortcuts.forEach(custom => {
      const index = merged.findIndex(s => s.id === custom.id);
      if (index >= 0) {
        merged[index] = custom;
      } else {
        merged.push(custom);
      }
    });
    return merged;
  }, [customShortcuts]);

  const parseKey = useCallback((keyString: string): { key: string; ctrl: boolean; shift: boolean; alt: boolean; meta: boolean } => {
    const parts = keyString.split('+').map(s => s.trim().toLowerCase());
    return {
      key: parts[parts.length - 1],
      ctrl: parts.includes('ctrl'),
      shift: parts.includes('shift'),
      alt: parts.includes('alt'),
      meta: parts.includes('cmd') || parts.includes('meta'),
    };
  }, []);

  const matchesKey = useCallback((event: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
    const parsed = parseKey(shortcut.keys);
    const key = event.key.toLowerCase();

    return (
      key === parsed.key &&
      event.ctrlKey === parsed.ctrl &&
      event.shiftKey === parsed.shift &&
      event.altKey === parsed.alt &&
      (event.metaKey === parsed.meta || event.ctrlKey === parsed.meta) // Cmd on Mac, Ctrl on Windows
    );
  }, [parseKey]);

  useEffect(() => {
    if (!enabled || options?.enabled === false) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in input/textarea (unless global)
      const isInput = document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement;

      if (isInput && options?.ignoreInputs !== false) {
        // Check for global shortcuts
        const globalShortcuts = allShortcuts().filter(s => s.global);
        const matched = globalShortcuts.find(s => matchesKey(event, s));
        if (matched && handlers[matched.action]) {
          event.preventDefault();
          handlers[matched.action]!();
        }
        return;
      }

      const matched = allShortcuts().find(s => matchesKey(event, s));
      if (matched && handlers[matched.action]) {
        event.preventDefault();
        handlers[matched.action]!();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handlers, allShortcuts, matchesKey, options]);

  const updateShortcut = useCallback((id: string, keys: string) => {
    setCustomShortcuts(prev => {
      const existing = prev.find(s => s.id === id);
      if (existing) {
        return prev.map(s => s.id === id ? { ...s, keys } : s);
      }
      const defaultShortcut = defaultShortcuts.find(s => s.id === id);
      if (defaultShortcut) {
        return [...prev, { ...defaultShortcut, keys }];
      }
      return prev;
    });
  }, [setCustomShortcuts]);

  const resetShortcuts = useCallback(() => {
    setCustomShortcuts([]);
  }, [setCustomShortcuts]);

  return {
    shortcuts: allShortcuts(),
    updateShortcut,
    resetShortcuts,
    enabled,
    setEnabled,
  };
};
