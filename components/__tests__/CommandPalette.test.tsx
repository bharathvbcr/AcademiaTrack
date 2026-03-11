import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CommandPalette from '../CommandPalette';
import { CommandProvider, useCommandRegistry } from '../../contexts/CommandContext';
import React, { useEffect } from 'react';

const TestCommandInjector: React.FC = () => {
    const { registerCommand } = useCommandRegistry();
    
    useEffect(() => {
        registerCommand({
            id: 'test-1',
            title: 'Action Command',
            group: 'Actions',
            type: 'action',
            icon: 'add',
            execute: vi.fn(),
        });
        registerCommand({
            id: 'test-2',
            title: 'Nav Command',
            group: 'Navigation',
            type: 'navigation',
            icon: 'home',
            execute: vi.fn(),
        });
    }, [registerCommand]);

    return null;
};

describe('CommandPalette', () => {
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        window.HTMLElement.prototype.scrollIntoView = vi.fn();
    });

    it('does not render when closed', () => {
        render(
            <CommandProvider>
                <CommandPalette isOpen={false} onClose={mockOnClose} />
            </CommandProvider>
        );
        expect(screen.queryByPlaceholderText(/Type to search/i)).not.toBeInTheDocument();
    });

    it('renders and filters commands', async () => {
        render(
            <CommandProvider>
                <TestCommandInjector />
                <CommandPalette isOpen={true} onClose={mockOnClose} />
            </CommandProvider>
        );

        const input = screen.getByPlaceholderText(/Type to search/i);
        
        // Initial state shows all
        expect(screen.getByText('Action Command')).toBeInTheDocument();
        expect(screen.getByText('Nav Command')).toBeInTheDocument();

        // Filter
        fireEvent.change(input, { target: { value: 'action' } });
        expect(screen.getByText('Action Command')).toBeInTheDocument();
        expect(screen.queryByText('Nav Command')).not.toBeInTheDocument();
    });

    it('navigates with keyboard', () => {
        render(
            <CommandProvider>
                <TestCommandInjector />
                <CommandPalette isOpen={true} onClose={mockOnClose} />
            </CommandProvider>
        );

        const input = screen.getByPlaceholderText(/Type to search/i);
        
        // Use group to find the options since the main text might be inside a div
        const options = screen.getAllByRole('option');
        expect(options[0]).toHaveAttribute('aria-selected', 'true');
        expect(options[1]).toHaveAttribute('aria-selected', 'false');

        // Arrow down
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        expect(options[0]).toHaveAttribute('aria-selected', 'false');
        expect(options[1]).toHaveAttribute('aria-selected', 'true');
    });

    it('executes command on enter', () => {
        const executeSpy = vi.fn();
        
        const CommandSpecificInjector: React.FC = () => {
            const { registerCommand } = useCommandRegistry();
            useEffect(() => {
                registerCommand({
                    id: 'exec-me',
                    title: 'Execute Me',
                    group: 'Test',
                    type: 'action',
                    icon: 'test',
                    execute: executeSpy,
                });
            }, []);
            return null;
        };

        render(
            <CommandProvider>
                <CommandSpecificInjector />
                <CommandPalette isOpen={true} onClose={mockOnClose} />
            </CommandProvider>
        );

        const input = screen.getByPlaceholderText(/Type to search/i);
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(executeSpy).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes on escape', () => {
        render(
            <CommandProvider>
                <CommandPalette isOpen={true} onClose={mockOnClose} />
            </CommandProvider>
        );

        const input = screen.getByPlaceholderText(/Type to search/i);
        fireEvent.keyDown(input, { key: 'Escape' });

        expect(mockOnClose).toHaveBeenCalled();
    });
});
