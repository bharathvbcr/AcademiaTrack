const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

const userDataPath = app.getPath('userData');
const dataFilePath = path.join(userDataPath, 'data.json');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../AcademiaTrack.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('load-data', async () => {
    try {
      if (fs.existsSync(dataFilePath)) {
        const data = fs.readFileSync(dataFilePath, 'utf-8');
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('Failed to load data:', error);
      return null;
    }
  });

  ipcMain.handle('save-data', async (event, data) => {
    try {
      fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save data:', error);
      return false;
    }
  });

  ipcMain.handle('show-notification', async (event, { title, body }) => {
    new Notification({ title, body }).show();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
