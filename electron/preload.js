const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  selectFile: () => ipcRenderer.invoke('select-file'),
  openFile: (path) => ipcRenderer.invoke('open-file', path),
  // Document storage
  copyDocument: (sourcePath, appId, docType) => ipcRenderer.invoke('copy-document', { sourcePath, appId, docType }),
  deleteDocument: (path) => ipcRenderer.invoke('delete-document', path),
  // Backup methods
  createBackup: () => ipcRenderer.invoke('create-backup'),
  listBackups: () => ipcRenderer.invoke('list-backups'),
  restoreBackup: (path) => ipcRenderer.invoke('restore-backup', path),
  deleteBackup: (path) => ipcRenderer.invoke('delete-backup', path),
  autoBackup: () => ipcRenderer.invoke('auto-backup'),
  // Version & Updates
  getVersionInfo: () => ipcRenderer.invoke('get-version-info'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('update-status');
  },
});
