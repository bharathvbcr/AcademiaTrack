import { useEnhancedKeyboardShortcuts } from './useEnhancedKeyboardShortcuts';

interface KeyboardShortcutOptions {
  enabled?: boolean;
  ignoreInputs?: boolean;
}

export const useKeyboardShortcuts = (
  extraShortcuts: { [key: string]: () => void } = {},
  options: KeyboardShortcutOptions = {}
) => {
  return useEnhancedKeyboardShortcuts(extraShortcuts, {
    enabled: options.enabled,
    ignoreInputs: options.ignoreInputs,
    listen: true,
  });
};

