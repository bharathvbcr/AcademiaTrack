import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.hoisted(() => vi.fn());
const appWindow = vi.hoisted(() => ({
  minimize: vi.fn(),
  toggleMaximize: vi.fn(),
  close: vi.fn(),
  isMaximized: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke,
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => appWindow,
}));

describe('installDesktopBridge', () => {
  beforeEach(() => {
    vi.resetModules();
    invoke.mockReset();
    appWindow.minimize.mockReset();
    appWindow.toggleMaximize.mockReset();
    appWindow.close.mockReset();
    appWindow.isMaximized.mockReset();
    appWindow.isMaximized.mockResolvedValue(false);

    delete window.desktop;
    delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it('does not install a bridge in the browser-only renderer', async () => {
    const { installDesktopBridge } = await import('../desktopBridge');

    installDesktopBridge();

    expect(window.desktop).toBeUndefined();
  });

  it('installs a Tauri-backed desktop API using the existing window.desktop contract', async () => {
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    const { DESKTOP_BRIDGE_READY_EVENT, installDesktopBridge } = await import('../desktopBridge');
    const bridgeReady = vi.fn();
    window.addEventListener(DESKTOP_BRIDGE_READY_EVENT, bridgeReady);

    installDesktopBridge();

    expect(window.desktop).toBeDefined();
    expect(bridgeReady).toHaveBeenCalledTimes(1);
    window.removeEventListener(DESKTOP_BRIDGE_READY_EVENT, bridgeReady);

    await window.desktop?.saveData({ applications: [] });
    await window.desktop?.copyDocument('C:/source/cv.pdf', 'app/1', 'cv');
    await window.desktop?.deleteDocument('C:/stored/cv.pdf');
    await window.desktop?.restoreBackup('C:/backup.json');

    expect(invoke).toHaveBeenCalledWith('save_data', { data: { applications: [] } });
    expect(invoke).toHaveBeenCalledWith('copy_document', {
      sourcePath: 'C:/source/cv.pdf',
      appId: 'app/1',
      docType: 'cv',
    });
    expect(invoke).toHaveBeenCalledWith('delete_document', { filePath: 'C:/stored/cv.pdf' });
    expect(invoke).toHaveBeenCalledWith('restore_backup', { backupPath: 'C:/backup.json' });
  });

  it('routes Tauri window controls through the current app window', async () => {
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    const { installDesktopBridge } = await import('../desktopBridge');

    installDesktopBridge();

    await window.desktop?.windowControls.minimize();
    await window.desktop?.windowControls.maximize();
    await window.desktop?.windowControls.close();

    expect(appWindow.minimize).toHaveBeenCalled();
    expect(appWindow.toggleMaximize).toHaveBeenCalled();
    expect(appWindow.close).toHaveBeenCalled();
    expect(appWindow.isMaximized).toHaveBeenCalled();
  });

  it('reports desktop runtime when the Tauri runtime or bridge is present', async () => {
    const { installDesktopBridge, isDesktopRuntime } = await import('../desktopBridge');

    expect(isDesktopRuntime()).toBe(false);

    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    expect(isDesktopRuntime()).toBe(true);

    installDesktopBridge();
    delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;

    expect(isDesktopRuntime()).toBe(true);
  });
});
