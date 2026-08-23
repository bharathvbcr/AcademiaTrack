/**
 * Vite dev plugin — auto-starts the Python semantic sidecar when enabled.
 * Skips spawn if a healthy instance is already listening on the configured port.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const DEFAULT_PORT = 8765;
const DEFAULT_HOST = '127.0.0.1';

function semanticDevEnabled() {
    const off = ['0', 'false', 'no', 'off'];
    if (off.includes(String(process.env.SEMANTIC_ENABLED ?? '').toLowerCase())) return false;
    if (off.includes(String(process.env.VITE_SEMANTIC_ENABLED ?? '').toLowerCase())) return false;
    return true;
}

function resolvePythonExecutable() {
    const venvPython = join(REPO_ROOT, '.venv-semantic', 'bin', 'python');
    if (existsSync(venvPython)) return venvPython;
    const venvPython3 = join(REPO_ROOT, '.venv-semantic', 'bin', 'python3');
    if (existsSync(venvPython3)) return venvPython3;
    return process.env.SEMANTIC_PYTHON || 'python3';
}

function sidecarBaseUrl() {
    const port = Number(process.env.SEMANTIC_SERVER_PORT || DEFAULT_PORT);
    const host = process.env.SEMANTIC_SERVER_HOST || DEFAULT_HOST;
    return `http://${host}:${port}`;
}

async function probeHealth(baseUrl) {
    try {
        const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(800) });
        if (!res.ok) return null;
        const body = await res.json();
        if (body?.enabled) return body;
    } catch {
        /* sidecar not up yet */
    }
    return null;
}

export function semanticSidecarPlugin() {
    /** @type {import('node:child_process').ChildProcess | null} */
    let child = null;
    let spawnedByPlugin = false;

    async function startSidecar() {
        if (!semanticDevEnabled()) {
            console.log('[semantic] dev sidecar disabled (SEMANTIC_ENABLED=0 or VITE_SEMANTIC_ENABLED=0)');
            return;
        }

        const baseUrl = sidecarBaseUrl();
        const existing = await probeHealth(baseUrl);
        if (existing?.ready) {
            console.log(`[semantic] using existing sidecar at ${baseUrl}`);
            return;
        }

        const python = resolvePythonExecutable();
        const port = process.env.SEMANTIC_SERVER_PORT || String(DEFAULT_PORT);
        const host = process.env.SEMANTIC_SERVER_HOST || DEFAULT_HOST;
        const devAuthToken = process.env.VITE_SEMANTIC_AUTH_TOKEN || '';
        if (!devAuthToken && process.env.SEMANTIC_AUTH_TOKEN) {
            console.warn(
                '[semantic] ignoring SEMANTIC_AUTH_TOKEN: the browser client cannot read it. '
                + 'Use VITE_SEMANTIC_AUTH_TOKEN to test the authenticated path in dev.',
            );
        }
        if (devAuthToken) {
            console.log('[semantic] dev sidecar will require the VITE_SEMANTIC_AUTH_TOKEN secret');
        }

        child = spawn(
            python,
            ['-m', 'semantic_layer.server'],
            {
                cwd: REPO_ROOT,
                env: {
                    ...process.env,
                    SEMANTIC_ENABLED: '1',
                    SEMANTIC_SERVER_HOST: host,
                    SEMANTIC_SERVER_PORT: port,
                    PYTHONPATH: REPO_ROOT,
                    // The browser client can only send a token Vite exposed to
                    // it, i.e. a VITE_-prefixed one. Handing the child a bare
                    // SEMANTIC_AUTH_TOKEN inherited from the shell would make
                    // it demand a secret the page cannot produce, turning every
                    // dev request into an unexplained 401. Keep the two in step
                    // by deriving the child's token from the client's var.
                    SEMANTIC_AUTH_TOKEN: devAuthToken,
                },
                stdio: ['ignore', 'pipe', 'pipe'],
            },
        );
        spawnedByPlugin = true;

        child.stdout?.on('data', (chunk) => {
            const line = String(chunk).trim();
            if (line) console.log(`[semantic] ${line}`);
        });
        child.stderr?.on('data', (chunk) => {
            const line = String(chunk).trim();
            if (line) console.warn(`[semantic] ${line}`);
        });

        child.on('error', (err) => {
            console.warn('[semantic] failed to spawn sidecar:', err.message);
        });

        child.on('exit', (code, signal) => {
            if (spawnedByPlugin && code !== 0 && code !== null) {
                console.warn(`[semantic] sidecar exited (code=${code}, signal=${signal ?? 'none'})`);
            }
            child = null;
            spawnedByPlugin = false;
        });

        const deadline = Date.now() + 25_000;
        while (Date.now() < deadline) {
            const health = await probeHealth(baseUrl);
            if (health?.enabled) {
                console.log(`[semantic] sidecar ready at ${baseUrl}`);
                return;
            }
            await new Promise((r) => setTimeout(r, 250));
        }

        const fallback = await probeHealth(baseUrl);
        if (fallback?.enabled) {
            console.log(`[semantic] sidecar reachable at ${baseUrl} (still warming up)`);
            return;
        }

        console.warn(
            `[semantic] sidecar did not become ready at ${baseUrl} — chat will fall back to direct Ollama`,
        );
    }

    function stopSidecar() {
        if (child && spawnedByPlugin && !child.killed) {
            child.kill('SIGTERM');
        }
        child = null;
        spawnedByPlugin = false;
    }

    return {
        name: 'semantic-sidecar',
        configureServer() {
            void startSidecar();
        },
        buildEnd() {
            stopSidecar();
        },
    };
}
