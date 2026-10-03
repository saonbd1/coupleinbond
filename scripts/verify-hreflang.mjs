// Temporary: verify hreflang reciprocity across the built output.
import fs from 'node:fs';
import path from 'node:path';

const dist = 'C:/Users/saonb/git/coupleinbond/dist';
const SITE = 'https://couplein.bond';

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
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

  const isBn = p.route.startsWith('/bn/');
  if (isBn) {
    if (p.alts.bn !== p.canon) problems.push(`${p.route}: bn self-ref should equal canonical (got ${p.alts.bn})`);
  } else {
    if (p.alts.en !== p.canon) problems.push(`${p.route}: en self-ref should equal canonical (got ${p.alts.en})`);
  }
}

// True reciprocity: if A points at B via hreflang, B must point back at A.
for (const p of info.values()) {
  const other = p.route.startsWith('/bn/') ? p.alts.en : p.alts.bn;
  if (!other) continue;
  const target = info.get(other);
  if (!target) { problems.push(`${p.route}: hreflang points at ${other}, which has no built page`); continue; }
  const back = target.route.startsWith('/bn/') ? target.alts.en : target.alts.bn;
  if (back !== p.canon) {
    problems.push(`${p.route} -> ${other} is NOT reciprocal (${other} points back at ${back}, expected ${p.canon})`);
  }
}

const paired = [...info.values()].filter(p => p.alts.bn).length;
console.log(`Pages audited: ${pages.length}`);
console.log(`Pages with an EN<->BN pair: ${paired}`);
console.log(`Bengali pages: ${[...info.values()].filter(p => p.route.startsWith('/bn/')).length}`);
if (problems.length) {
  console.log(`\nPROBLEMS (${problems.length}):`);
  problems.forEach(p => console.log(' - ' + p));
  process.exit(1);
}
console.log('\nhreflang reciprocity: OK - no problems found.');