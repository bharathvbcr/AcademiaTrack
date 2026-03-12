import { app, BrowserWindow, ipcMain, dialog, shell, Notification } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { copyFile, mkdir, readdir, readFile, rename, stat, unlink, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let lastMaximized = false;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// --- Single Instance Lock ---
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  function sendMaximizeState(force = false) {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const current = mainWindow.isMaximized();
    if (force || current !== lastMaximized) {
      lastMaximized = current;
      mainWindow.webContents.send('maximizeChange', current);
    }
  }

  function sendUpdateStatus(payload: any) {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('updateStatus', payload);
  }

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus({ status: 'checking' });
  });
  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({ status: 'available', version: info.version });
  });
  autoUpdater.on('update-not-available', () => {
    sendUpdateStatus({ status: 'not-available' });
  });
  autoUpdater.on('error', (err) => {
    sendUpdateStatus({ status: 'error', message: err.message });
  });
  autoUpdater.on('download-progress', (progressObj) => {
    sendUpdateStatus({ status: 'downloading', percent: progressObj.percent });
  });
  autoUpdater.on('update-downloaded', () => {
    sendUpdateStatus({ status: 'downloaded' });
  });

  async function setupApp() {
    await app.whenReady();

    const userDataPath = app.getPath('userData');
    const dataFilePath = path.join(userDataPath, 'data.json');
    const documentsDir = path.join(userDataPath, 'documents');
    const backupDir = path.join(userDataPath, '.backup');

    await mkdir(userDataPath, { recursive: true });
    await mkdir(documentsDir, { recursive: true });
    await mkdir(backupDir, { recursive: true });

    mainWindow = new BrowserWindow({
      title: 'AcademiaTrack',
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      show: false, // Show window when ready-to-show
      titleBarStyle: 'hidden',
      icon: path.join(__dirname, '../assets/icon.png'),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    mainWindow.once('ready-to-show', () => {
      mainWindow?.show();
    });

    lastMaximized = mainWindow.isMaximized();
    mainWindow.on('resize', () => sendMaximizeState());
    mainWindow.on('close', () => {
      mainWindow = null;
    });

    if (isDev) {
      mainWindow.loadURL('http://localhost:3000');
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // --- IPC Handlers ---
    ipcMain.handle('loadData', async () => {
      try {
        if (!fs.existsSync(dataFilePath)) return null;
        const data = await readFile(dataFilePath, 'utf-8');
        return JSON.parse(data);
      } catch (error) {
        console.error('Failed to load data:', error);
        return null;
      }
    });

    ipcMain.handle('saveData', async (_event, data) => {
      try {
        const tempPath = `${dataFilePath}.tmp`;
        await writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
        await rename(tempPath, dataFilePath);
        return true;
      } catch (error) {
        console.error('Failed to save data:', error);
        return false;
      }
    });

    ipcMain.handle('showNotification', async (_event, { title, body }) => {
      new Notification({ title, body }).show();
    });

    ipcMain.handle('selectFile', async () => {
      if (!mainWindow) return null;
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt'] }],
        defaultPath: app.getPath('documents'),
      });
      if (canceled || filePaths.length === 0) return null;
      return filePaths[0];
    });

    ipcMain.handle('openFile', async (_event, filePath) => {
      await shell.openPath(filePath);
    });

    ipcMain.handle('copyDocument', async (_event, { sourcePath, appId, docType }) => {
      try {
        const appDocDir = path.join(documentsDir, appId);
        await mkdir(appDocDir, { recursive: true });
        const ext = path.extname(sourcePath);
        const destPath = path.join(appDocDir, `${docType}${ext}`);
        await copyFile(sourcePath, destPath);
        return { success: true, path: destPath };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    });

    ipcMain.handle('deleteDocument', async (_event, filePath) => {
      try {
        if (fs.existsSync(filePath)) await unlink(filePath);
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    });

    ipcMain.handle('createBackup', async () => {
      try {
        if (!fs.existsSync(dataFilePath)) return { success: false, error: 'No data to backup' };
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `backup-${timestamp}.json`);
        await copyFile(dataFilePath, backupPath);
        return { success: true, path: backupPath, timestamp };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    });

    ipcMain.handle('listBackups', async () => {
      try {
        if (!fs.existsSync(backupDir)) return [];
        const files = await readdir(backupDir);
        const backups = await Promise.all(
          files
            .filter((file) => file.startsWith('backup-') && file.endsWith('.json'))
            .map(async (file) => {
              const backupPath = path.join(backupDir, file);
              const stats = await stat(backupPath);
              return {
                filename: file,
                path: backupPath,
                timestamp: stats.mtime.toISOString(),
                size: stats.size,
              };
            }),
        );
        backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return backups;
      } catch {
        return [];
      }
    });

    ipcMain.handle('restoreBackup', async (_event, backupPath) => {
      try {
        if (!fs.existsSync(backupPath)) return { success: false, error: 'Backup file not found' };
        if (fs.existsSync(dataFilePath)) {
          const safetyPath = path.join(backupDir, `pre-restore-${Date.now()}.json`);
          await copyFile(dataFilePath, safetyPath);
        }
        await copyFile(backupPath, dataFilePath);
        const data = await readFile(dataFilePath, 'utf-8');
        return { success: true, data: JSON.parse(data) };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    });

    ipcMain.handle('deleteBackup', async (_event, backupPath) => {
      try {
        if (fs.existsSync(backupPath)) await unlink(backupPath);
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    });

    ipcMain.handle('autoBackup', async () => {
      try {
        if (!fs.existsSync(dataFilePath)) return { success: false, error: 'No data to backup' };
        const autoBackupPath = path.join(backupDir, 'auto-backup.json');
        await copyFile(dataFilePath, autoBackupPath);
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    });

    ipcMain.handle('getVersionInfo', () => {
      return {
        version: app.getVersion(),
        name: app.getName(),
        node: process.versions.node,
        platform: process.platform,
        arch: process.arch,
      };
    });

    ipcMain.handle('checkForUpdates', async () => {
      try {
        const result = await autoUpdater.checkForUpdates();
        if (result && result.updateInfo) {
          return { available: true, version: result.updateInfo.version };
        }
        return { available: false };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { available: false, error: message };
      }
    });

    ipcMain.handle('downloadUpdate', async () => {
      try {
        await autoUpdater.downloadUpdate();
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    });

    ipcMain.handle('installUpdate', async () => {
      try {
        autoUpdater.quitAndInstall();
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    });

    ipcMain.handle('windowMinimize', () => {
      mainWindow?.minimize();
    });

    ipcMain.handle('windowMaximize', () => {
      if (!mainWindow) return;
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
      sendMaximizeState(true);
    });

    ipcMain.handle('windowClose', () => {
      mainWindow?.close();
    });

    ipcMain.handle('windowIsMaximized', () => {
      return mainWindow?.isMaximized() ?? false;
    });

    ipcMain.handle('syncWindowState', () => {
      sendMaximizeState(true);
      return mainWindow?.isMaximized() ?? false;
    });
  }

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      setupApp();
    }
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });

  setupApp();
}
