export type CommandResultType = 'action' | 'navigation' | 'entity' | 'filter' | 'search' | 'settings';

export type CommandShortcutScope = 'global' | 'local';

export type CommandSection =
  | 'navigation'
  | 'actions'
  | 'views'
  | 'selection'
  | 'settings'
  | 'search'
  | 'modals'
  | 'system'
  | 'unknown';

export interface CommandShortcut {
  id: string;
  commandId: string;
  keys: string;
  description: string;
  section: CommandSection;
  shortcutScope: CommandShortcutScope;
  enabled: boolean;
}

export interface AppCommand {
  id: string;
  title: string;
  subtitle?: string;
  group: string;
  type: CommandResultType;
  icon: string;
  shortcut?: string;
  defaultShortcut?: string;
  shortcutScope?: CommandShortcutScope;
  section?: CommandSection;
  keywords?: string[];
  execute: () => void;
  isVisible?: () => boolean;
  metadata?: Record<string, unknown>;
}

export interface CommandSearchResult {
  command: AppCommand;
  score: number;
  matchType: 'exact' | 'prefix' | 'keyword' | 'fuzzy' | 'none';
}
