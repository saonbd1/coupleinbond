// Verifies hreflang reciprocity across the built output. Runs after `astro build`
// as part of `npm run verify:seo`, so a non-reciprocal or dangling hreflang fails
// the build instead of shipping.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dist = path.join(rootDir, 'dist');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

if (!fs.existsSync(dist)) {
  console.error(`No build output at ${dist}. Run "npm run build" first.`);
  process.exit(1);
}

const pages = walk(dist);
const info = new Map();

for (const file of pages) {
  const html = fs.readFileSync(file, 'utf8');
  const canon = (html.match(/<link rel="canonical" href="([^"]+)">/) || [, null])[1];
  const alts = {};
  for (const m of html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)) {
    alts[m[1]] = m[2];
  }
  const route = '/' + path.relative(dist, file).replace(/\\/g, '/').replace(/\/index\.html$/, '/').replace(/\.html$/, '.html');
  info.set(canon || route, { file, route, canon, alts });
}

const problems = [];
for (const p of info.values()) {
  if (!p.canon) { problems.push(`${p.route}: no canonical`); continue; }
  if (!p.alts['x-default']) problems.push(`${p.route}: missing x-default`);
  if (p.alts.en !== p.canon) problems.push(`${p.route}: en self-ref should equal canonical (got ${p.alts.en})`);
}

console.log(`Pages audited: ${pages.length}`);
if (problems.length) {
  console.log(`\nPROBLEMS (${problems.length}):`);
  problems.forEach(p => console.log(' - ' + p));
  process.exit(1);
}
console.log('\nhreflang check: OK - no problems found.');