import { useCallback, useEffect, useMemo } from 'react';
import { useCommandRegistry } from '../contexts/CommandContext';
import { useLocalStorage } from './useLocalStorage';
import { CommandShortcut, CommandShortcutScope } from '../types/commands';

interface StoredShortcut {
  id: string;
  keys: string;
}

export interface KeyboardShortcut {
  id: string;
  commandId: string;
  keys: string;
  description: string;
  category: string;
  shortcutScope: CommandShortcutScope;
  enabled: boolean;
}

interface HookOptions {
  enabled?: boolean;
  ignoreInputs?: boolean;
  listen?: boolean;
}

const toShortcutScope = (scope?: CommandShortcutScope): CommandShortcutScope => scope ?? 'local';

const normalizeShortcut = (keys: string) => keys.trim();

const parseShortcut = (shortcut: string) => {
  const parts = shortcut.split('+').map(s => s.trim().toLowerCase()).filter(Boolean);
  return {
    key: parts[parts.length - 1] ?? '',
    ctrl: parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    meta: parts.includes('cmd') || parts.includes('meta'),
  };
};

const toKeyName = (event: KeyboardEvent) => event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();

const isEditableElement = () =>
  document.activeElement instanceof HTMLInputElement ||
  document.activeElement instanceof HTMLTextAreaElement ||
  (document.activeElement as HTMLElement)?.isContentEditable;

const eventHasModifier = (event: KeyboardEvent, hasMeta: boolean, hasCtrl: boolean) => {
  if (hasMeta) {
    return event.metaKey || event.ctrlKey;
  }

  if (hasCtrl) {
    return event.ctrlKey || event.metaKey;
  }

  return !(event.ctrlKey || event.metaKey);
};

const isShortcutMatch = (event: KeyboardEvent, keys: string): boolean => {
  const parsed = parseShortcut(keys);
  const eventKey = toKeyName(event);

  if (parsed.key !== eventKey) return false;

  if (parsed.shift !== event.shiftKey) return false;
  if (parsed.alt !== event.altKey) return false;
  if (!eventHasModifier(event, parsed.meta, parsed.ctrl)) return false;

  if (parsed.ctrl && parsed.meta) {
    return false;
  }

  return true;
};

export const useEnhancedKeyboardShortcuts = (
  handlers: Record<string, () => void> = {},
  options: HookOptions = {}
) => {
  const { commands, getCommandShortcuts, executeCommand } = useCommandRegistry();
  const [customShortcuts, setCustomShortcuts] = useLocalStorage<StoredShortcut[]>('custom-keyboard-shortcuts', []);
  const [enabled, setEnabled] = useLocalStorage<boolean>('keyboard-shortcuts-enabled', true);

  const commandShortcuts = useMemo(() => {
    const registryShortcuts = getCommandShortcuts().map(shortcut => ({
      ...shortcut,
      shortcutScope: toShortcutScope(shortcut.shortcutScope),
      keys: normalizeShortcut(shortcut.keys),
      description: shortcut.description,
    }));

    const registryById = new Map(commands.map(c => [c.id, c]));
    const customById = new Map(customShortcuts.map(s => [s.id, s.keys]));

    return registryShortcuts
      .filter(shortcut => registryById.has(shortcut.commandId))
      .map(shortcut => ({
        ...shortcut,
        keys: normalizeShortcut(customById.get(shortcut.commandId) ?? shortcut.keys),
      }))
      .filter(shortcut => shortcut.keys.length > 0);
  }, [commands, customShortcuts, getCommandShortcuts]);

  const allShortcuts = useCallback(() => {
    if (!commands.length) return [] as CommandShortcut[];
    return commandShortcuts;
  }, [commandShortcuts, commands]);

  const shortcutsForSettings: KeyboardShortcut[] = useMemo(() => (
    allShortcuts().map(shortcut => ({
      id: shortcut.id,
      commandId: shortcut.commandId,
      keys: shortcut.keys,
      description: shortcut.description,
      category: shortcut.section,
      shortcutScope: shortcut.shortcutScope,
      enabled: shortcut.enabled,
    }))
  ), [allShortcuts]);

  const resolveHandler = useCallback((shortcut: CommandShortcut) => {
    const commandHandler = handlers[shortcut.commandId];
    if (commandHandler) {
      return commandHandler;
    }

    return () => executeCommand(shortcut.commandId);
  }, [executeCommand, handlers]);

  const findDirectHandler = useCallback((event: KeyboardEvent) => {
    const match = Object.entries(handlers).find(([shortcut]) => isShortcutMatch(event, shortcut));
    if (!match) return null;

    return match[1];
  }, [handlers]);

  const updateShortcut = useCallback((id: string, keys: string) => {
    const trimmed = normalizeShortcut(keys);
    setCustomShortcuts(prev => {
      const existing = prev.find(s => s.id === id);
      if (existing) {
        return prev.map(s => s.id === id ? { ...s, keys: trimmed } : s);
      }
      return [...prev, { id, keys: trimmed }];
    });
  }, [setCustomShortcuts]);

  const resetShortcuts = useCallback(() => setCustomShortcuts([]), [setCustomShortcuts]);

  useEffect(() => {
    if (!enabled || options.enabled === false) return;
    if (options.listen === false) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const directHandler = findDirectHandler(event);
      if (directHandler && event.cancelable) {
        event.preventDefault();
        directHandler();
        return;
      }

      const shortcuts = allShortcuts();
      const activeShortcut = shortcuts.find(shortcut => isShortcutMatch(event, shortcut.keys));
      if (!activeShortcut) {
        return;
      }

      const isInput = isEditableElement();
      const isGlobal = activeShortcut.shortcutScope === 'global';
      if (isInput && !isGlobal && options.ignoreInputs !== false) {
        return;
      }

      const handler = resolveHandler(activeShortcut);
      event.preventDefault();
      handler();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allShortcuts, enabled, findDirectHandler, options.enabled, options.ignoreInputs, options.listen, resolveHandler]);

  return {
    shortcuts: shortcutsForSettings,
    updateShortcut,
    resetShortcuts,
    enabled,
    setEnabled,
  };
};
