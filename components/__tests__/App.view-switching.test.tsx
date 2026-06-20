import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { CommandProvider } from '../../contexts/CommandContext';

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

describe('App view switching', () => {
  it('switches views from the rendered header without render-depth errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation((message?: unknown, ...args: unknown[]) => {
      const text = String(message);

      if (text.includes('Maximum update depth exceeded')) {
        throw new Error(text);
      }

      if (text.includes('change in the order of Hooks')) {
        throw new Error(text);
      }

      console.warn(message, ...args);
    });

    try {
      render(
        <CommandProvider>
          <App />
        </CommandProvider>
      );

      const kanbanButton = await screen.findByRole('button', { name: 'Kanban Board' });
      fireEvent.click(kanbanButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Kanban Board' })).toHaveAttribute('aria-pressed', 'true');
      });
    } finally {
      consoleError.mockRestore();
    }
  });
});
