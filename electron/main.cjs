const { app, BrowserWindow, ipcMain, Notification, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Auto-updater (only in production)
let autoUpdater = null;
if (process.env.NODE_ENV !== 'development') {
  try {
    autoUpdater = require('electron-updater').autoUpdater;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
  } catch (e) {
    console.log('Auto-updater not available');
  }
}

const userDataPath = app.getPath('userData');
const dataFilePath = path.join(userDataPath, 'data.json');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
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
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  // --- Auto-updater handlers ---
  if (autoUpdater) {
    autoUpdater.on('checking-for-update', () => {
      mainWindow?.webContents.send('update-status', { status: 'checking' });
    });

    autoUpdater.on('update-available', (info) => {
      mainWindow?.webContents.send('update-status', {
        status: 'available',
        version: info.version,
        releaseNotes: info.releaseNotes
      });
    });

    autoUpdater.on('update-not-available', () => {
      mainWindow?.webContents.send('update-status', { status: 'not-available' });
    });

    autoUpdater.on('download-progress', (progress) => {
      mainWindow?.webContents.send('update-status', {
        status: 'downloading',
        percent: progress.percent
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      mainWindow?.webContents.send('update-status', {
        status: 'downloaded',
        version: info.version
      });
    });

    autoUpdater.on('error', (err) => {
      mainWindow?.webContents.send('update-status', {
        status: 'error',
        message: err.message
      });
    });

    // Check for updates after app starts
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => { });
    }, 3000);
  }

  // IPC: Get app version info
  ipcMain.handle('get-version-info', async () => {
    return {
      version: app.getVersion(),
      name: app.getName(),
      electron: process.versions.electron,
      node: process.versions.node,
      chrome: process.versions.chrome,
      platform: process.platform,
      arch: process.arch,
    };
  });

  // IPC: Check for updates
  ipcMain.handle('check-for-updates', async () => {
    if (!autoUpdater) {
      return { available: false, reason: 'Auto-updater not available in development' };
    }
    try {
      const result = await autoUpdater.checkForUpdates();
      return { available: !!result?.updateInfo, version: result?.updateInfo?.version };
    } catch (error) {
      return { available: false, error: error.message };
    }
  });

  // IPC: Download update
  ipcMain.handle('download-update', async () => {
    if (!autoUpdater) return { success: false };
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // IPC: Install update and restart
  ipcMain.handle('install-update', async () => {
    if (!autoUpdater) return { success: false };
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  });

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
      const tempPath = `${dataFilePath}.tmp`;
      await fs.promises.writeFile(tempPath, JSON.stringify(data, null, 2));
      await fs.promises.rename(tempPath, dataFilePath);
      return true;
    } catch (error) {
      console.error('Failed to save data:', error);
      return false;
    }
  });

  ipcMain.handle('show-notification', async (event, { title, body }) => {
    new Notification({ title, body }).show();
  });

  ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt'] }]
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('open-file', async (event, filePath) => {
    await shell.openPath(filePath);
  });

  // Documents directory for file storage
  const documentsDir = path.join(userDataPath, 'documents');

  // Ensure documents directory exists
  if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
  }

  // Copy document to app storage
  ipcMain.handle('copy-document', async (event, { sourcePath, appId, docType }) => {
    try {
      const appDocDir = path.join(documentsDir, appId);
      if (!fs.existsSync(appDocDir)) {
        fs.mkdirSync(appDocDir, { recursive: true });
      }

      const ext = path.extname(sourcePath);
      const destFileName = `${docType}${ext}`;
      const destPath = path.join(appDocDir, destFileName);

      await fs.promises.copyFile(sourcePath, destPath);
      return { success: true, path: destPath };
    } catch (error) {
      console.error('Failed to copy document:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete document from app storage
  ipcMain.handle('delete-document', async (event, filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to delete document:', error);
      return { success: false, error: error.message };
    }
  });

  // Backup directory
  const backupDir = path.join(userDataPath, '.backup');

  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Create backup
  ipcMain.handle('create-backup', async () => {
    try {
      if (!fs.existsSync(dataFilePath)) {
        return { success: false, error: 'No data to backup' };
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `backup-${timestamp}.json`);
      await fs.promises.copyFile(dataFilePath, backupPath);
      return { success: true, path: backupPath, timestamp };
    } catch (error) {
      console.error('Failed to create backup:', error);
      return { success: false, error: error.message };
    }
  });

  // List backups
  ipcMain.handle('list-backups', async () => {
    try {
      if (!fs.existsSync(backupDir)) {
        return [];
      }
      const files = await fs.promises.readdir(backupDir);
      const backups = files
        .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
        .map(f => {
          const stats = fs.statSync(path.join(backupDir, f));
          return {
            filename: f,
            path: path.join(backupDir, f),
            timestamp: stats.mtime.toISOString(),
            size: stats.size,
          };
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return backups;
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  });

  // Restore from backup
  ipcMain.handle('restore-backup', async (event, backupPath) => {
    try {
      if (!fs.existsSync(backupPath)) {
        return { success: false, error: 'Backup file not found' };
      }
      // Create safety backup before restore
      if (fs.existsSync(dataFilePath)) {
        const safetyPath = path.join(backupDir, `pre-restore-${Date.now()}.json`);
        await fs.promises.copyFile(dataFilePath, safetyPath);
      }
      await fs.promises.copyFile(backupPath, dataFilePath);
      // Reload data
      const data = fs.readFileSync(dataFilePath, 'utf-8');
      return { success: true, data: JSON.parse(data) };
    } catch (error) {
      console.error('Failed to restore backup:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete backup
  ipcMain.handle('delete-backup', async (event, backupPath) => {
    try {
      if (fs.existsSync(backupPath)) {
        await fs.promises.unlink(backupPath);
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to delete backup:', error);
      return { success: false, error: error.message };
    }
  });

  // Auto-backup on close (triggered from renderer)
  ipcMain.handle('auto-backup', async () => {
    try {
      if (!fs.existsSync(dataFilePath)) return { success: false };
      const autoBackupPath = path.join(backupDir, 'auto-backup.json');
      await fs.promises.copyFile(dataFilePath, autoBackupPath);
      return { success: true };
    } catch (error) {
      console.error('Auto-backup failed:', error);
      return { success: false };
    }
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
