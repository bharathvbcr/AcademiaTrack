/**
 * Renderer dev server with autoport:
 * - Preview launchers set PORT → bind exactly that port.
 * - Otherwise prefer 3000 and let Vite pick the next free port if busy.
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_PORT = 3000;

const assignedPort = process.env.PORT?.trim();
const parsedPort = Number(assignedPort);
const hasAssignedPort =
  Boolean(assignedPort) &&
  Number.isInteger(parsedPort) &&
  parsedPort > 0 &&
  parsedPort <= 65535;

const port = hasAssignedPort ? String(parsedPort) : String(DEFAULT_PORT);
const viteArgs = ['vite', '--port', port, '--strictPort', hasAssignedPort ? 'true' : 'false'];

const child = spawn('npx', viteArgs, {
  cwd: repoRoot,
  env: process.env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
