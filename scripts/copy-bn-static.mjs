import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sourceDir = path.join(rootDir, 'bn');
const targetDir = path.join(rootDir, 'public', 'bn');

const require = createRequire(import.meta.url);
const { execFileSync } = require('node:child_process');

if (!fs.existsSync(sourceDir)) {
  console.log(`No Bengali static content found at ${sourceDir}; skipping copy.`);
  process.exit(0);
}

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });
fs.cpSync(sourceDir, targetDir, { recursive: true });

console.log(`Copied Bengali static pages from ${sourceDir} to ${targetDir}`);

// The engine that writes bn/<slug>.html (generate-bn-content.mjs) now does it
// directly, so public/bn/ is a committed build snapshot that has to stay
// byte-identical to the committed source. Confirm that after every copy.
const cmp = () =>
  execFileSync('diff', ['-q', sourceDir, targetDir], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
try {
  cmp();
  console.log('BN static snapshot in sync.');
} catch (err) {
  console.error(
    'BN static snapshot MISMATCH — sourcediff:',
    err.stderr || 'unknown',
  );
  process.exitCode = 1;
}
