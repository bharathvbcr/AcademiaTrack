import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import SettingsModal from '../SettingsModal';
import { CommandProvider } from '../../contexts/CommandContext';

vi.mock('../../hooks/useLockBodyScroll', () => ({
  useLockBodyScroll: vi.fn(),
}));

describe('SettingsModal wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens column configuration from view settings', () => {
    const onOpenColumnConfig = vi.fn();
    const onClose = vi.fn();

    render(
      <CommandProvider>
        <SettingsModal
          isOpen
          onClose={onClose}
          initialTab="views"
          onOpenColumnConfig={onOpenColumnConfig}
        />
      </CommandProvider>
    );

    fireEvent.click(screen.getByText('Configure Columns'));

    expect(onClose).toHaveBeenCalled();
    expect(onOpenColumnConfig).toHaveBeenCalled();
  });

  it('calls desktop backup and update APIs from general settings', async () => {
    const desktop = {
      listBackups: vi.fn().mockResolvedValue([]),
      createBackup: vi.fn().mockResolvedValue({ success: true }),
      checkForUpdates: vi.fn().mockResolvedValue({ available: false }),
      onUpdateStatus: vi.fn().mockReturnValue(vi.fn()),
    };
    Object.defineProperty(window, 'desktop', {
      configurable: true,
      value: desktop,
    });

    render(
      <CommandProvider>
        <SettingsModal isOpen onClose={vi.fn()} initialTab="general" />
      </CommandProvider>
    );

    fireEvent.click(screen.getByText('Create Backup'));
    await waitFor(() => {
      expect(desktop.createBackup).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('Check'));
    await waitFor(() => {
      expect(desktop.checkForUpdates).toHaveBeenCalled();
    });
  });
});
