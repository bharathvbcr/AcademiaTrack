import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { AppCommand, CommandSearchResult, CommandShortcut } from '../types/commands';

interface CommandContextType {
    commands: AppCommand[];
    registerCommand: (command: AppCommand) => void;
    unregisterCommand: (id: string) => void;
    executeCommand: (id: string) => void;
    searchCommands: (query: string) => CommandSearchResult[];
    getCommandShortcuts: () => CommandShortcut[];
}

const CommandContext = createContext<CommandContextType | undefined>(undefined);

export const CommandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [commands, setCommands] = useState<AppCommand[]>([]);

    const registerCommand = useCallback((command: AppCommand) => {
        setCommands(prev => {
            const index = prev.findIndex(c => c.id === command.id);
            if (index !== -1) {
                const newCommands = [...prev];
                newCommands[index] = command;
                return newCommands;
            }
            return [...prev, command];
        });
    }, []);

    const unregisterCommand = useCallback((id: string) => {
        setCommands(prev => prev.filter(c => c.id !== id));
    }, []);

    const executeCommand = useCallback((id: string) => {
        const command = commands.find(c => c.id === id);
        if (command && (!command.isVisible || command.isVisible())) {
            command.execute();
        }
    }, [commands]);

    const searchCommands = useCallback((query: string): CommandSearchResult[] => {
        const trimmedQuery = query.trim().toLowerCase();
        
        // Handle tokens
        let filterType: 'command' | 'entity' | 'searchFilter' | null = null;
        let actualQuery = trimmedQuery;

        if (trimmedQuery.startsWith('>')) {
            filterType = 'command';
            actualQuery = trimmedQuery.slice(1).trim();
        } else if (trimmedQuery.startsWith('@')) {
            filterType = 'entity';
            actualQuery = trimmedQuery.slice(1).trim();
        } else if (trimmedQuery.startsWith('#')) {
            filterType = 'searchFilter';
            actualQuery = trimmedQuery.slice(1).trim();
        }

        const visibleCommands = commands.filter(c => !c.isVisible || c.isVisible());

        const matchesTypeFilter = (command: AppCommand) => {
            if (!filterType) {
                return true;
            }

            if (filterType === 'command') {
                return command.type !== 'entity' && command.type !== 'search' && command.type !== 'filter';
            }

            if (filterType === 'searchFilter') {
                return command.type === 'search' || command.type === 'filter';
            }

            return command.type === filterType;
        };
        
        const results: CommandSearchResult[] = visibleCommands
            .filter(matchesTypeFilter)
            .map(command => {
                if (!actualQuery) {
                    return { command, score: 1, matchType: 'none' as const };
                }

                const title = command.title.toLowerCase();
                const subtitle = command.subtitle?.toLowerCase() || '';
                const keywords = command.keywords?.map(k => k.toLowerCase()) || [];

                if (title === actualQuery) {
                    return { command, score: 100, matchType: 'exact' as const };
                }

                if (title.startsWith(actualQuery)) {
                    return { command, score: 80, matchType: 'prefix' as const };
                }

                if (keywords.some(k => k.includes(actualQuery)) || title.includes(actualQuery) || subtitle.includes(actualQuery)) {
                    return { command, score: 60, matchType: 'keyword' as const };
                }

                // Simple fuzzy match (all chars present in order)
                let queryIdx = 0;
                for (let i = 0; i < title.length && queryIdx < actualQuery.length; i++) {
                    if (title[i] === actualQuery[queryIdx]) {
                        queryIdx++;
                    }
                }

                if (queryIdx === actualQuery.length) {
                    return { command, score: 40, matchType: 'fuzzy' as const };
                }

                return { command, score: 0, matchType: 'none' as const };
            })
            .filter(r => !actualQuery || r.score > 0)
            .sort((a, b) => b.score - a.score);

        return results;
    }, [commands]);

    const getCommandShortcuts = useCallback((): CommandShortcut[] => {
        return commands.map(command => {
            const shortcut = command.shortcut ?? command.defaultShortcut;
            return {
                id: command.id,
                commandId: command.id,
                keys: shortcut || '',
                description: command.title,
                section: command.section ?? 'unknown',
                shortcutScope: command.shortcutScope ?? 'local',
                enabled: !!shortcut,
            };
        }).filter(shortcut => shortcut.keys);
    }, [commands]);

    const value = useMemo(() => ({
        commands,
        registerCommand,
        unregisterCommand,
        executeCommand,
        searchCommands,
        getCommandShortcuts,
    }), [commands, registerCommand, unregisterCommand, executeCommand, searchCommands]);

    return (
        <CommandContext.Provider value={value}>
            {children}
        </CommandContext.Provider>
    );
};

export const useCommandRegistry = () => {
    const context = useContext(CommandContext);
    if (!context) {
        throw new Error('useCommandRegistry must be used within a CommandProvider');
    }
    return context;
};
