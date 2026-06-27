import type { DesktopAPI } from "../types/interfaces";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export const DESKTOP_BRIDGE_READY_EVENT = "academiatrack:desktop-bridge-ready";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export const isTauriRuntime = () =>
  typeof window !== "undefined" && window.__TAURI_INTERNALS__ !== undefined;

// macOS draws native traffic-light controls inset over a transparent title bar,
// so the renderer hides its custom window buttons and indents content there.
export const isMacOS = () =>
  typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);

export const isDesktopRuntime = () => {
  if (typeof window === "undefined") return false;

  return Boolean(window.desktop?.windowControls || isTauriRuntime());
};

const announceDesktopBridgeReady = () => {
  window.dispatchEvent(new Event(DESKTOP_BRIDGE_READY_EVENT));
};

const installTauriBridge = () => {
  const appWindow = getCurrentWindow();
  const maximizeListeners = new Set<(isMaximized: boolean) => void>();

  const notifyMaximizeListeners = async () => {
    const isMaximized = await appWindow.isMaximized();
    for (const listener of maximizeListeners) {
      listener(isMaximized);
    }
  };

  window.addEventListener("resize", () => {
    void notifyMaximizeListeners();
  });

  const desktopApi: DesktopAPI = {
    selectFile: () => invoke<string | null>("select_file"),
    openFile: (filePath: string) => invoke("open_file", { filePath }),
    loadData: () => invoke("load_data"),
    saveData: async (data: unknown) => {
      await invoke("save_data", { data });
    },
    showNotification: (title: string, body: string) => {
      void invoke("show_notification", { title, body }).catch(error => {
        console.error("Failed to show Tauri notification:", error);
      });
    },
    getVersionInfo: () => invoke("get_version_info"),
    checkForUpdates: () => invoke("check_for_updates"),
    downloadUpdate: () => invoke("download_update"),
    installUpdate: () => invoke("install_update"),
    onUpdateStatus: () => () => {},
    copyDocument: (sourcePath: string, appId: string, docType: string) =>
      invoke("copy_document", { sourcePath, appId, docType }),
    deleteDocument: (filePath: string) => invoke("delete_document", { filePath }),
    createBackup: () => invoke("create_backup"),
    listBackups: () => invoke("list_backups"),
    restoreBackup: (filename: string) => invoke("restore_backup", { filename }),
    deleteBackup: (filename: string) => invoke("delete_backup", { filename }),
    autoBackup: () => invoke("auto_backup"),
    windowControls: {
      minimize: () => appWindow.minimize(),
      maximize: async () => {
        await appWindow.toggleMaximize();
        await notifyMaximizeListeners();
      },
      close: () => appWindow.close(),
      isMaximized: () => appWindow.isMaximized(),
      onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
        maximizeListeners.add(callback);
        void appWindow.isMaximized().then(callback);
        return () => {
          maximizeListeners.delete(callback);
        };
      },
    },
  };

  window.desktop = desktopApi;
  announceDesktopBridgeReady();
};

// Installs the Tauri-backed desktop API on `window.desktop`. No-ops in a plain
// browser renderer and when a bridge has already been installed.
export function installDesktopBridge() {
  if (typeof window !== "undefined" && window.desktop) {
    announceDesktopBridgeReady();
    return;
  }

  if (isTauriRuntime()) {
    installTauriBridge();
  }
}
