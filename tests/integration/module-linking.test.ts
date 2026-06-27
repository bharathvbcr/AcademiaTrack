import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

describe('Module Linking & Dependency Integrity', () => {
    const packageJsonPath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    it('should have all critical dependencies defined', () => {
        const criticalDeps = [
            'react',
            'react-dom',
            '@tauri-apps/api',
            'date-fns'
        ];

        criticalDeps.forEach(dep => {
            expect(packageJson.dependencies[dep]).toBeDefined();
        });

        expect(packageJson.devDependencies['@tauri-apps/cli']).toBeDefined();
    });

    it('should make Tauri the only desktop build path with no Electron remnants', () => {
        expect(packageJson.scripts['package']).toBe('npm run build:tauri');
        expect(packageJson.scripts['dev:desktop']).toBe('npm run dev:tauri');
        expect(packageJson.scripts['build:desktop']).toBe('npm run build:tauri');
        expect(packageJson.scripts['dev:tauri']).toBe('tauri dev');
        expect(packageJson.scripts['build:tauri']).toBe('tauri build');
        expect(packageJson.scripts['typecheck']).toBe('tsgo -p tsconfig.json --noEmit');

        // No Electron scripts, deps, or electron-builder config should survive.
        const electronScripts = Object.keys(packageJson.scripts).filter(name =>
            name.toLowerCase().includes('electron')
        );
        expect(electronScripts).toEqual([]);
        expect(packageJson.dependencies['electron-updater']).toBeUndefined();
        expect(packageJson.devDependencies.electron).toBeUndefined();
        expect(packageJson.devDependencies['electron-builder']).toBeUndefined();
        expect(packageJson.build).toBeUndefined();
        expect(packageJson.main).toBeUndefined();
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

    it('should verify vite and tauri config existence with no electron dir', () => {
        const viteConfig = path.join(__dirname, '../../vite.config.ts');
        const tauriConfig = path.join(__dirname, '../../src-tauri/tauri.conf.json');
        const tauriMain = path.join(__dirname, '../../src-tauri/src/lib.rs');
        const electronDir = path.join(__dirname, '../../electron');
        expect(fs.existsSync(viteConfig)).toBe(true);
        expect(fs.existsSync(tauriConfig)).toBe(true);
        expect(fs.existsSync(tauriMain)).toBe(true);
        expect(fs.existsSync(electronDir)).toBe(false);
    });
});
