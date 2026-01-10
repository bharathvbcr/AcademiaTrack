import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30000,
    retries: 2,
    use: {
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'electron',
            use: {
                // Playwright Electron launch will be handled in the test file itself usually using _electron.launch
                // But we can define global config here.
            }
        },
    ],
    outputDir: 'test-results/',
});
