import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const getTauriExecutablePath = () => {
    if (process.platform === 'win32') {
        return path.join(repoRoot, 'src-tauri', 'target', 'release', 'academia-track.exe');
    }

    if (process.platform === 'darwin') {
        return path.join(repoRoot, 'src-tauri', 'target', 'release', 'academia-track');
    }

    return path.join(repoRoot, 'src-tauri', 'target', 'release', 'academia-track');
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const stopProcess = async (processHandle: ChildProcess) => {
    if (processHandle.exitCode !== null || processHandle.killed) return;

    processHandle.kill();
    await Promise.race([
        new Promise(resolve => processHandle.once('exit', resolve)),
        wait(3000),
    ]);

    if (processHandle.exitCode === null && !processHandle.killed) {
        processHandle.kill('SIGKILL');
    }
};

test.describe('Application Launch', () => {
    test('built Tauri executable starts and remains alive', async () => {
        test.setTimeout(15000);

        const executablePath = getTauriExecutablePath();
        test.skip(!fs.existsSync(executablePath), 'Run `npm run build:tauri` before the packaged launch smoke test.');

        let exit: { code: number | null; signal: NodeJS.Signals | null } | null = null;
        const app = spawn(executablePath, [], {
            cwd: repoRoot,
            env: process.env,
            stdio: 'ignore',
        });

        app.once('exit', (code, signal) => {
            exit = { code, signal };
        });

        try {
            await wait(5000);
            expect(exit).toBeNull();
        } finally {
            await stopProcess(app);
        }
    });
});
