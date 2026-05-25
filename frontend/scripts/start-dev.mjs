import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readPort(fallback = '3352') {
  try {
    const content = readFileSync(resolve(root, '.env.local'), 'utf8');
    const match = content.match(/^PORT=(\d+)/m);
    return match ? match[1] : fallback;
  } catch {
    return fallback;
  }
}

const port = readPort();
const args = process.argv.slice(2);
const mem = args.find(a => a.startsWith('--mem='))?.split('=')[1] ?? '8192';
const turbo = args.includes('--turbopack');
const bundler = turbo ? '--turbopack' : '--webpack';

console.log(`[start-dev] port=${port}  mem=${mem}MB  bundler=${bundler}`);

const child = spawn(
  process.execPath,
  [`--max-old-space-size=${mem}`, 'node_modules/next/dist/bin/next', 'dev', bundler, '-p', port],
  { stdio: 'inherit', cwd: root }
);

child.on('exit', code => process.exit(code ?? 0));
