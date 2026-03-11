import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import { CommandProvider, useCommandRegistry } from '../../contexts/CommandContext';
import React, { useEffect } from 'react';

const ShortcutTester: React.FC<{ extra?: { [key: string]: () => void } }> = ({ extra }) => {
    useKeyboardShortcuts(extra);
    return <div data-testid="tester">Shortcut Tester</div>;
};

const CommandInjector: React.FC<{ id: string; shortcut: string; execute: () => void }> = ({ id, shortcut, execute }) => {
    const { registerCommand } = useCommandRegistry();
    useEffect(() => {
        registerCommand({
            id,
            title: 'Test Command',
            group: 'Test',
            type: 'action',
            icon: 'test',
            shortcut,
            execute,
        });
    }, [id, shortcut, execute, registerCommand]);
    return null;
};

describe('useKeyboardShortcuts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('triggers command from registry', () => {
        const mockExecute = vi.fn();
        render(
            <CommandProvider>
                <CommandInjector id="cmd-1" shortcut="Ctrl+K" execute={mockExecute} />
                <ShortcutTester />
            </CommandProvider>
        );

        fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
        expect(mockExecute).toHaveBeenCalled();
    });

    it('triggers extra shortcuts', () => {
        const mockExtra = vi.fn();
        render(
            <CommandProvider>
                <ShortcutTester extra={{ 'Ctrl+Shift+X': mockExtra }} />
            </CommandProvider>
        );

        fireEvent.keyDown(window, { key: 'x', ctrlKey: true, shiftKey: true });
        expect(mockExtra).toHaveBeenCalled();
    });

    it('extra shortcuts override registry', () => {
        const mockRegistry = vi.fn();
        const mockExtra = vi.fn();
        render(
            <CommandProvider>
                <CommandInjector id="cmd-1" shortcut="Ctrl+K" execute={mockRegistry} />
                <ShortcutTester extra={{ 'Ctrl+K': mockExtra }} />
            </CommandProvider>
        );

        fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
        expect(mockExtra).toHaveBeenCalled();
        expect(mockRegistry).not.toHaveBeenCalled();
    });

    it('does not trigger when typing in input', () => {
        const mockExecute = vi.fn();
        render(
            <CommandProvider>
                <CommandInjector id="cmd-1" shortcut="Ctrl+K" execute={mockExecute} />
                <ShortcutTester />
                <input data-testid="test-input" />
            </CommandProvider>
        );

        const input = screen.getByTestId('test-input');
        input.focus();
        fireEvent.keyDown(input, { key: 'k', ctrlKey: true });
        
        expect(mockExecute).not.toHaveBeenCalled();
    });
});
