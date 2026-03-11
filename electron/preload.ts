import { contextBridge, ipcRenderer } from 'electron';

const updateListeners = new Set<(payload: any) => void>();
const maximizeListeners = new Set<(isMaximized: boolean) => void>();

ipcRenderer.on('updateStatus', (_event, payload) => {
  for (const listener of updateListeners) {
    listener(payload);
  }
});

ipcRenderer.on('maximizeChange', (_event, isMaximized) => {
  for (const listener of maximizeListeners) {
    listener(isMaximized);
  }
});

const desktopApi = {
  selectFile: () => ipcRenderer.invoke('selectFile'),
  openFile: (filePath: string) => ipcRenderer.invoke('openFile', filePath),
  loadData: () => ipcRenderer.invoke('loadData'),
  saveData: (data: any) => ipcRenderer.invoke('saveData', data),
  showNotification: (title: string, body: string) => ipcRenderer.invoke('showNotification', { title, body }),
  getVersionInfo: () => ipcRenderer.invoke('getVersionInfo'),
  checkForUpdates: () => ipcRenderer.invoke('checkForUpdates'),
  downloadUpdate: () => ipcRenderer.invoke('downloadUpdate'),
  installUpdate: () => ipcRenderer.invoke('installUpdate'),
  onUpdateStatus: (callback: (payload: any) => void) => {
    updateListeners.add(callback);
    return () => {
      updateListeners.delete(callback);
    };
  },
  copyDocument: (sourcePath: string, appId: string, docType: string) =>
    ipcRenderer.invoke('copyDocument', { sourcePath, appId, docType }),
  deleteDocument: (filePath: string) => ipcRenderer.invoke('deleteDocument', filePath),
  createBackup: () => ipcRenderer.invoke('createBackup'),
  listBackups: () => ipcRenderer.invoke('listBackups'),
  restoreBackup: (backupPath: string) => ipcRenderer.invoke('restoreBackup', backupPath),
  deleteBackup: (backupPath: string) => ipcRenderer.invoke('deleteBackup', backupPath),
  autoBackup: () => ipcRenderer.invoke('autoBackup'),
  windowControls: {
    minimize: () => ipcRenderer.invoke('windowMinimize'),
    maximize: () => ipcRenderer.invoke('windowMaximize'),
    close: () => ipcRenderer.invoke('windowClose'),
    isMaximized: () => ipcRenderer.invoke('windowIsMaximized'),
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
      maximizeListeners.add(callback);
      ipcRenderer.invoke('syncWindowState').then(callback);
      return () => {
        maximizeListeners.delete(callback);
      };
    },
  },
};

contextBridge.exposeInMainWorld('desktop', desktopApi);
contextBridge.exposeInMainWorld('electron', desktopApi);
