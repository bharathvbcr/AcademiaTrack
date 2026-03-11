import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { CommandProvider, useCommandRegistry } from '../CommandContext';
import React from 'react';

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CommandProvider>{children}</CommandProvider>
);

describe('CommandContext', () => {
    it('registers and unregisters commands', () => {
        const { result } = renderHook(() => useCommandRegistry(), { wrapper });

        const testCommand = {
            id: 'test-cmd',
            title: 'Test Command',
            group: 'Test',
            type: 'action' as const,
            icon: 'test',
            execute: () => { },
        };

        act(() => {
            result.current.registerCommand(testCommand);
        });

        expect(result.current.commands).toContainEqual(testCommand);

        act(() => {
            result.current.unregisterCommand('test-cmd');
        });

        expect(result.current.commands).not.toContainEqual(testCommand);
    });

    it('searches commands correctly', () => {
        const { result } = renderHook(() => useCommandRegistry(), { wrapper });

        act(() => {
            result.current.registerCommand({
                id: 'cmd-1',
                title: 'Open Settings',
                group: 'System',
                type: 'settings',
                icon: 'settings',
                execute: () => { },
                keywords: ['preferences'],
            });
            result.current.registerCommand({
                id: 'cmd-2',
                title: 'Switch to Kanban',
                group: 'Navigation',
                type: 'navigation',
                icon: 'view_kanban',
                execute: () => { },
            });
        });

        // Search by title
        let searchResults = result.current.searchCommands('settings');
        expect(searchResults[0].command.id).toBe('cmd-1');
        expect(searchResults[0].matchType).toBe('keyword');

        // Search by keyword
        searchResults = result.current.searchCommands('preferences');
        expect(searchResults[0].command.id).toBe('cmd-1');
        expect(searchResults[0].matchType).toBe('keyword');

        // Prefix match
        searchResults = result.current.searchCommands('switch');
        expect(searchResults[0].command.id).toBe('cmd-2');
        expect(searchResults[0].matchType).toBe('prefix');
    });

    it('handles tokens correctly', () => {
        const { result } = renderHook(() => useCommandRegistry(), { wrapper });

        act(() => {
            result.current.registerCommand({
                id: 'act-1',
                title: 'Do Action',
                group: 'Actions',
                type: 'action',
                icon: 'add',
                execute: () => { },
            });
            result.current.registerCommand({
                id: 'nav-1',
                title: 'Go Home',
                group: 'Navigation',
                type: 'navigation',
                icon: 'home',
                execute: () => { },
            });
            result.current.registerCommand({
                id: 'search-1',
                title: 'Saved Search',
                group: 'Search',
                type: 'search',
                icon: 'search',
                execute: () => { },
            });
            result.current.registerCommand({
                id: 'filter-1',
                title: 'Saved Filter',
                group: 'Search',
                type: 'filter',
                icon: 'filter_alt',
                execute: () => { },
            });
        });

        // Action token
        let searchResults = result.current.searchCommands('> action');
        expect(searchResults.every(r => r.command.type === 'action')).toBe(true);

        // Navigation token (using @ for entities as navigation is separate category in searchCommands logic)
        // Wait, in my searchCommands logic:
        // > is action
        // @ is entity
        // # is filter
        // navigation is not a token but we can check if it works for action
        
        searchResults = result.current.searchCommands('> do');
        expect(searchResults[0].command.id).toBe('act-1');

        searchResults = result.current.searchCommands('# saved');
        expect(searchResults.map(r => r.command.id)).toContain('search-1');
        expect(searchResults.map(r => r.command.id)).toContain('filter-1');
        expect(searchResults.every(r => ['search', 'filter'].includes(r.command.type))).toBe(true);

        searchResults = result.current.searchCommands('@ saved');
        expect(searchResults.length).toBe(0);
    });

    it('respects visibility predicate', () => {
        const { result } = renderHook(() => useCommandRegistry(), { wrapper });

        let isVisible = true;
        act(() => {
            result.current.registerCommand({
                id: 'visible-cmd',
                title: 'Conditional Command',
                group: 'Test',
                type: 'action',
                icon: 'test',
                execute: () => { },
                isVisible: () => isVisible,
            });
        });

        expect(result.current.searchCommands('conditional').length).toBe(1);

        isVisible = false;
        expect(result.current.searchCommands('conditional').length).toBe(0);
    });
});
