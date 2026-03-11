import Electrobun from "electrobun/view";
import type { BackupInfo, BackupResult, DesktopAPI } from "../types/interfaces";

type UpdateStatus = {
  status: string;
  version?: string;
  releaseNotes?: string;
  percent?: number;
  message?: string;
};

type AcademiaRPC = {
  bun: {
    requests: {
      loadData: { params: void; response: unknown | null };
      saveData: { params: unknown; response: boolean };
      showNotification: { params: { title: string; body: string }; response: void };
      selectFile: { params: void; response: string | null };
      openFile: { params: string; response: void };
      copyDocument: {
        params: { sourcePath: string; appId: string; docType: string };
        response: BackupResult;
      };
      deleteDocument: { params: string; response: BackupResult };
      createBackup: { params: void; response: BackupResult };
      listBackups: { params: void; response: BackupInfo[] };
      restoreBackup: { params: string; response: BackupResult };
      deleteBackup: { params: string; response: BackupResult };
      autoBackup: { params: void; response: BackupResult };
      getVersionInfo: {
        params: void;
        response: { version: string; name: string; bun: string; platform: string; arch: string };
      };
      checkForUpdates: {
        params: void;
        response: { available: boolean; version?: string; error?: string; reason?: string };
      };
      downloadUpdate: { params: void; response: { success: boolean; error?: string } };
      installUpdate: { params: void; response: { success: boolean; error?: string } };
      windowMinimize: { params: void; response: void };
      windowMaximize: { params: void; response: void };
      windowClose: { params: void; response: void };
      windowIsMaximized: { params: void; response: boolean };
      syncWindowState: { params: void; response: boolean };
    };
    messages: {};
  };
  webview: {
    requests: {};
    messages: {
      updateStatus: UpdateStatus;
      maximizeChange: boolean;
    };
  };
};

const updateListeners = new Set<(payload: UpdateStatus) => void>();
const maximizeListeners = new Set<(isMaximized: boolean) => void>();

let initialized = false;
let rpcInstance: ReturnType<typeof Electrobun.Electroview.defineRPC<AcademiaRPC>> | null = null;

function initRPC() {
  if (initialized && rpcInstance) {
    return rpcInstance;
  }

  rpcInstance = Electrobun.Electroview.defineRPC<AcademiaRPC>({
    handlers: {
      requests: {},
      messages: {
        updateStatus(payload) {
          for (const listener of updateListeners) {
            listener(payload);
          }
        },
        maximizeChange(payload) {
          for (const listener of maximizeListeners) {
            listener(payload);
          }
        },
      },
    },
  });

  new Electrobun.Electroview({ rpc: rpcInstance });
  initialized = true;
  return rpcInstance;
}

export function installDesktopBridge() {
  const hasElectrobunGlobals =
    typeof window !== "undefined" &&
    typeof (window as Window & { __electrobun?: unknown }).__electrobun !== "undefined";

  if (!hasElectrobunGlobals || window.desktop) {
    return;
  }

  const rpc = initRPC();
  if (!rpc) {
    return;
  }

  const desktopApi: DesktopAPI = {
    selectFile: () => rpc.request.selectFile(),
    openFile: (filePath) => rpc.request.openFile(filePath),
    loadData: () => rpc.request.loadData(),
    saveData: async (data) => {
      await rpc.request.saveData(data);
    },
    showNotification: (title, body) => {
      void rpc.request.showNotification({ title, body });
    },
    getVersionInfo: () => rpc.request.getVersionInfo(),
    checkForUpdates: () => rpc.request.checkForUpdates(),
    downloadUpdate: () => rpc.request.downloadUpdate(),
    installUpdate: () => rpc.request.installUpdate(),
    onUpdateStatus: (callback) => {
      updateListeners.add(callback);
      return () => {
        updateListeners.delete(callback);
      };
    },
    copyDocument: (sourcePath, appId, docType) =>
      rpc.request.copyDocument({ sourcePath, appId, docType }),
    deleteDocument: (filePath) => rpc.request.deleteDocument(filePath),
    createBackup: () => rpc.request.createBackup(),
    listBackups: () => rpc.request.listBackups(),
    restoreBackup: (backupPath) => rpc.request.restoreBackup(backupPath),
    deleteBackup: (backupPath) => rpc.request.deleteBackup(backupPath),
    autoBackup: () => rpc.request.autoBackup(),
    windowControls: {
      minimize: () => rpc.request.windowMinimize(),
      maximize: () => rpc.request.windowMaximize(),
      close: () => rpc.request.windowClose(),
      isMaximized: () => rpc.request.windowIsMaximized(),
      onMaximizeChange: (callback) => {
        maximizeListeners.add(callback);
        void rpc.request.syncWindowState().then(callback);
        return () => {
          maximizeListeners.delete(callback);
        };
      },
    },
  };

  window.desktop = desktopApi;
  window.electron = desktopApi;
}
