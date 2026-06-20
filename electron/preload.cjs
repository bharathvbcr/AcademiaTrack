const { contextBridge, ipcRenderer } = require('electron');

const updateListeners = new Set();
const maximizeListeners = new Set();

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
  openFile: (filePath) => ipcRenderer.invoke('openFile', filePath),
  loadData: () => ipcRenderer.invoke('loadData'),
  saveData: (data) => ipcRenderer.invoke('saveData', data),
  showNotification: (title, body) => ipcRenderer.invoke('showNotification', { title, body }),
  getVersionInfo: () => ipcRenderer.invoke('getVersionInfo'),
  checkForUpdates: () => ipcRenderer.invoke('checkForUpdates'),
  downloadUpdate: () => ipcRenderer.invoke('downloadUpdate'),
  installUpdate: () => ipcRenderer.invoke('installUpdate'),
  onUpdateStatus: (callback) => {
    updateListeners.add(callback);
    return () => {
      updateListeners.delete(callback);
    };
  },
  copyDocument: (sourcePath, appId, docType) =>
    ipcRenderer.invoke('copyDocument', { sourcePath, appId, docType }),
  deleteDocument: (filePath) => ipcRenderer.invoke('deleteDocument', filePath),
  createBackup: () => ipcRenderer.invoke('createBackup'),
  listBackups: () => ipcRenderer.invoke('listBackups'),
  restoreBackup: (backupPath) => ipcRenderer.invoke('restoreBackup', backupPath),
  deleteBackup: (backupPath) => ipcRenderer.invoke('deleteBackup', backupPath),
  autoBackup: () => ipcRenderer.invoke('autoBackup'),
  windowControls: {
    minimize: () => ipcRenderer.invoke('windowMinimize'),
    maximize: () => ipcRenderer.invoke('windowMaximize'),
    close: () => ipcRenderer.invoke('windowClose'),
    isMaximized: () => ipcRenderer.invoke('windowIsMaximized'),
    onMaximizeChange: (callback) => {
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
