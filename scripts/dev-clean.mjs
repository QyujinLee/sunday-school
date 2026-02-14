import { execSync, spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');

const lockPath = join(process.cwd(), '.next', 'dev', 'lock');
const nextPath = join(process.cwd(), '.next');

if (existsSync(lockPath)) {
  try {
    rmSync(lockPath, { force: true });
    console.log('[dev:clean] Removed .next/dev/lock');
  } catch (error) {
    console.warn('[dev:clean] Could not remove lock file:', error.message);
  }
}

if (existsSync(nextPath)) {
  try {
    rmSync(nextPath, { recursive: true, force: true });
    console.log('[dev:clean] Removed .next cache directory');
  } catch (error) {
    console.warn('[dev:clean] Could not remove .next directory:', error.message);
  }
}

for (const port of [3000, 3001]) {
  try {
    execSync(`npx kill-port ${port}`, { stdio: 'ignore' });
    console.log(`[dev:clean] Freed port ${port}`);
  } catch {
    // Ignore when port is already free.
  }
}

const child = spawn(process.execPath, [nextBin, 'dev'], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
