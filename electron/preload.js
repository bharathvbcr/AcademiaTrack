const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  selectFile: () => ipcRenderer.invoke('select-file'),
  openFile: (path) => ipcRenderer.invoke('open-file', path),
});
