import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Application Launch', () => {
    let electronApp;

    test.beforeEach(async () => {
        electronApp = await electron.launch({
            args: [path.join(__dirname, '../../electron/main.cjs')],
            env: { ...process.env, NODE_ENV: 'test' },
            timeout: 30000, // 30 second timeout for launch
        });
    });

    test.afterEach(async () => {
        await electronApp.close();
    });

    test('should launch the application', async () => {
        const appPath = await electronApp.evaluate(async ({ app }) => {
            return app.getAppPath();
        });
        console.log('App Launch Path:', appPath);
        expect(appPath).toBeTruthy();
    });

    test('should verify main window title', async () => {
        const window = await electronApp.firstWindow();
        const title = await window.title();
        // Allow for slight variations or just check it contains the main name
        expect(title).toContain('AcademiaTrack');
    });

    test('should load the main dashboard', async () => {
        const window = await electronApp.firstWindow();
        // Wait for a key element. Assuming there's a sidebar or header.
        // Adjust selector based on actual app content.
        await window.waitForLoadState('domcontentloaded');

        // Check for a generic root element if specific IDs are unknown yet
        const root = await window.$('#root');
        expect(root).toBeTruthy();
    });
});
