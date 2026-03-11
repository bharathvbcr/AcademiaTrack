import { mkdir, readdir, readFile, rename, stat, unlink, writeFile, copyFile } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import { BrowserView, BrowserWindow, BuildConfig, Updater, Utils } from "electrobun";
import packageJson from "../../package.json";

type UpdateStatusPayload = {
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
        response: { success: boolean; path?: string; error?: string };
      };
      deleteDocument: { params: string; response: { success: boolean; error?: string } };
      createBackup: { params: void; response: { success: boolean; path?: string; timestamp?: string; error?: string } };
      listBackups: {
        params: void;
        response: Array<{ filename: string; path: string; timestamp: string; size: number }>;
      };
      restoreBackup: { params: string; response: { success: boolean; data?: unknown; error?: string } };
      deleteBackup: { params: string; response: { success: boolean; error?: string } };
      autoBackup: { params: void; response: { success: boolean; error?: string } };
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
      updateStatus: UpdateStatusPayload;
      maximizeChange: boolean;
    };
  };
};

const buildConfig = await BuildConfig.get();
type DesktopRPC = ReturnType<typeof BrowserView.defineRPC<AcademiaRPC>>;

const userDataPath = Utils.paths.userData;
const dataFilePath = path.join(userDataPath, "data.json");
const documentsDir = path.join(userDataPath, "documents");
const backupDir = path.join(userDataPath, ".backup");

await mkdir(userDataPath, { recursive: true });
await mkdir(documentsDir, { recursive: true });
await mkdir(backupDir, { recursive: true });

let mainWindow: BrowserWindow<DesktopRPC> | null = null;
let lastMaximized = false;

function sendMaximizeState(force = false) {
  if (!mainWindow) {
    return;
  }

  const current = mainWindow.isMaximized();
  if (force || current !== lastMaximized) {
    lastMaximized = current;
    mainWindow.webview.rpc?.send.maximizeChange(current);
  }
}

function sendUpdateStatus(payload: UpdateStatusPayload) {
  mainWindow?.webview.rpc?.send.updateStatus(payload);
}

function getSafeVersionInfo() {
  const versionFile = path.resolve("../Resources/version.json");
  if (fs.existsSync(versionFile)) {
    return JSON.parse(fs.readFileSync(versionFile, "utf-8")) as {
      version: string;
      name: string;
    };
  }

  return {
    version: packageJson.version,
    name: "AcademiaTrack",
  };
}

function mapUpdaterStatus(entry: { status: string; message: string; details?: { progress?: number } }): UpdateStatusPayload {
  switch (entry.status) {
    case "checking":
      return { status: "checking" };
    case "update-available":
      return { status: "available" };
    case "no-update":
    case "check-complete":
      return { status: "not-available" };
    case "download-progress":
    case "downloading":
    case "download-starting":
    case "downloading-full-bundle":
      return { status: "downloading", percent: entry.details?.progress ?? 0 };
    case "download-complete":
      return { status: "downloaded" };
    case "error":
      return { status: "error", message: entry.message };
    default:
      return { status: entry.status, message: entry.message, percent: entry.details?.progress };
  }
}

Updater.onStatusChange((entry) => {
  sendUpdateStatus(mapUpdaterStatus(entry));
});

const rpc = BrowserView.defineRPC<AcademiaRPC>({
  handlers: {
    requests: {
      async loadData() {
        try {
          if (!fs.existsSync(dataFilePath)) {
            return null;
          }
          const data = await readFile(dataFilePath, "utf-8");
          return JSON.parse(data);
        } catch (error) {
          console.error("Failed to load data:", error);
          return null;
        }
      },
      async saveData(data) {
        try {
          const tempPath = `${dataFilePath}.tmp`;
          await writeFile(tempPath, JSON.stringify(data, null, 2), "utf-8");
          await rename(tempPath, dataFilePath);
          return true;
        } catch (error) {
          console.error("Failed to save data:", error);
          return false;
        }
      },
      async showNotification({ title, body }) {
        Utils.showNotification({ title, body });
      },
      async selectFile() {
        const filePaths = await Utils.openFileDialog({
          allowedFileTypes: "pdf,doc,docx,txt",
          canChooseFiles: true,
          canChooseDirectory: false,
          allowsMultipleSelection: false,
          startingFolder: Utils.paths.documents,
        });
        return filePaths[0] || null;
      },
      async openFile(filePath) {
        Utils.openPath(filePath);
      },
      async copyDocument({ sourcePath, appId, docType }) {
        try {
          const appDocDir = path.join(documentsDir, appId);
          await mkdir(appDocDir, { recursive: true });
          const ext = path.extname(sourcePath);
          const destPath = path.join(appDocDir, `${docType}${ext}`);
          await copyFile(sourcePath, destPath);
          return { success: true, path: destPath };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return { success: false, error: message };
        }
      },
      async deleteDocument(filePath) {
        try {
          if (fs.existsSync(filePath)) {
            await unlink(filePath);
          }
          return { success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return { success: false, error: message };
        }
      },
      async createBackup() {
        try {
          if (!fs.existsSync(dataFilePath)) {
            return { success: false, error: "No data to backup" };
          }
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const backupPath = path.join(backupDir, `backup-${timestamp}.json`);
          await copyFile(dataFilePath, backupPath);
          return { success: true, path: backupPath, timestamp };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return { success: false, error: message };
        }
      },
      async listBackups() {
        try {
          if (!fs.existsSync(backupDir)) {
            return [];
          }
          const files = await readdir(backupDir);
          const backups = await Promise.all(
            files
              .filter((file) => file.startsWith("backup-") && file.endsWith(".json"))
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
      },
      async restoreBackup(backupPath) {
        try {
          if (!fs.existsSync(backupPath)) {
            return { success: false, error: "Backup file not found" };
          }
          if (fs.existsSync(dataFilePath)) {
            const safetyPath = path.join(backupDir, `pre-restore-${Date.now()}.json`);
            await copyFile(dataFilePath, safetyPath);
          }
          await copyFile(backupPath, dataFilePath);
          const data = await readFile(dataFilePath, "utf-8");
          return { success: true, data: JSON.parse(data) };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return { success: false, error: message };
        }
      },
      async deleteBackup(backupPath) {
        try {
          if (fs.existsSync(backupPath)) {
            await unlink(backupPath);
          }
          return { success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return { success: false, error: message };
        }
      },
      async autoBackup() {
        try {
          if (!fs.existsSync(dataFilePath)) {
            return { success: false, error: "No data to backup" };
          }
          const autoBackupPath = path.join(backupDir, "auto-backup.json");
          await copyFile(dataFilePath, autoBackupPath);
          return { success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return { success: false, error: message };
        }
      },
      async getVersionInfo() {
        const localInfo = getSafeVersionInfo();
        return {
          version: localInfo.version,
          name: localInfo.name,
          bun: Bun.version,
          platform: process.platform,
          arch: process.arch,
        };
      },
      async checkForUpdates() {
        try {
          const baseUrl = await Updater.localInfo.baseUrl();
          if (!baseUrl) {
            return { available: false, reason: "No release baseUrl configured" };
          }
          const result = await Updater.checkForUpdate();
          if (result.updateAvailable) {
            sendUpdateStatus({ status: "available", version: result.version });
          } else {
            sendUpdateStatus({ status: "not-available" });
          }
          return { available: result.updateAvailable, version: result.version, error: result.error || undefined };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          sendUpdateStatus({ status: "error", message });
          return { available: false, error: message };
        }
      },
      async downloadUpdate() {
        try {
          await Updater.downloadUpdate();
          return { success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return { success: false, error: message };
        }
      },
      async installUpdate() {
        try {
          await Updater.applyUpdate();
          return { success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return { success: false, error: message };
        }
      },
      async windowMinimize() {
        mainWindow?.minimize();
      },
      async windowMaximize() {
        if (!mainWindow) {
          return;
        }
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
        sendMaximizeState(true);
      },
      async windowClose() {
        mainWindow?.close();
      },
      async windowIsMaximized() {
        return mainWindow?.isMaximized() ?? false;
      },
      async syncWindowState() {
        sendMaximizeState(true);
        return mainWindow?.isMaximized() ?? false;
      },
    },
    messages: {},
  },
});

function createMainWindow() {
  const isDev = process.env.NODE_ENV === "development";
  mainWindow = new BrowserWindow({
    title: "AcademiaTrack",
    frame: { x: 80, y: 80, width: 1200, height: 800 },
    titleBarStyle: "hidden",
    transparent: false,
    renderer: "native",
    rpc,
    url: isDev ? "http://localhost:3000" : "views://app/index.html",
  });

  lastMaximized = mainWindow.isMaximized();
  mainWindow.on("resize", () => {
    sendMaximizeState();
  });
  mainWindow.on("close", () => {
    mainWindow = null;
  });
}

createMainWindow();
