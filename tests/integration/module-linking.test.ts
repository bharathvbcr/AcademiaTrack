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
            'electrobun',
            'date-fns'
        ];

        criticalDeps.forEach(dep => {
            expect(packageJson.dependencies[dep]).toBeDefined();
        });

        expect(packageJson.dependencies.electrobun).toBe('1.15.1');
    });

    it('should have electrobun desktop scripts configured', () => {
        expect(packageJson.scripts['package']).toBe('bun run build:desktop');
        expect(packageJson.scripts['postinstall']).toBe('patch-package');
        expect(packageJson.scripts['dev:desktop']).toContain('electrobun dev');
        expect(packageJson.scripts['build:desktop']).toContain('electrobun build --env=stable');
        expect(packageJson.scripts['dev:electron']).toBe('npm run dev:desktop');
        expect(packageJson.scripts['build:electron']).toBe('npm run build:desktop');
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

    it('should verify vite and electrobun config existence', () => {
        const viteConfig = path.join(__dirname, '../../vite.config.ts');
        const electrobunConfig = path.join(__dirname, '../../electrobun.config.ts');
        const electrobunPatch = path.join(__dirname, '../../patches/electrobun+1.15.1.patch');
        expect(fs.existsSync(viteConfig)).toBe(true);
        expect(fs.existsSync(electrobunConfig)).toBe(true);
        expect(fs.existsSync(electrobunPatch)).toBe(true);
    });
});
