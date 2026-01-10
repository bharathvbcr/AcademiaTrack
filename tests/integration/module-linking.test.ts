import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Module Linking & Dependency Integrity', () => {
    const packageJsonPath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    it('should have all critical dependencies defined', () => {
        const criticalDeps = [
            'react',
            'react-dom',
            'electron-updater',
            'date-fns'
        ];

        criticalDeps.forEach(dep => {
            expect(packageJson.dependencies[dep]).toBeDefined();
        });
    });

    it('should have correct electron builder config', () => {
        expect(packageJson.build).toBeDefined();
        expect(packageJson.build.appId).toBe('com.bharathvbcr.academia-track');
        expect(packageJson.build.files).toContain('dist/**/*');
        expect(packageJson.build.files).toContain('electron/main.cjs');
    });

    it('should resolve key native modules', async () => {
        // This test simulates checking if native modules are potentially problematic
        // In a real build, we'd check the built artifact, but here we check for presence in node_modules
        const nativeModules = ['keytar', 'sqlite3']; // Example native modules if any, currently mostly JS deps

        // AcademiaTrack seems to be mostly JS based on package.json, 
        // but let's check for 'canvas-confetti' just to verify resolution logic works
        const checkModule = 'canvas-confetti';
        try {
            const modulePath = require.resolve(checkModule, { paths: [path.join(__dirname, '../../')] });
            expect(modulePath).toBeTruthy();
        } catch (e) {
            // Ideally we fail, but if it's strictly a dev env test, it depends on npm install state
            // passing checks effectively.
            expect(e).toBeNull();
        }
    });

    it('should verify vite config existence', () => {
        const viteConfig = path.join(__dirname, '../../vite.config.ts');
        expect(fs.existsSync(viteConfig)).toBe(true);
    });
});
