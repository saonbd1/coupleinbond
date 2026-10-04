// Guards against the nested-page path bug: pageRoot()/siteRoot() in
// social-icons.js are used to build footer links and shared-script URLs, and the
// footer is injected at runtime, so a plain crawl of the built HTML cannot see it.
// This script (1) exercises the real helper functions and (2) resolves every
// internal link and asset reference in the built output.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dist = path.join(rootDir, 'dist');

const problems = [];

// ---------- 1. exercise the real helpers ----------
function loadRootHelpers() {
  const src = fs.readFileSync(path.join(rootDir, 'public', 'social-icons.js'), 'utf8');
  const start = src.indexOf('function depthRoot()');
  const end = src.indexOf('function renderFooter');
  if (start === -1 || end === -1) throw new Error('Could not locate depthRoot/pageRoot/siteRoot in social-icons.js');
  const body = src.slice(start, end);
  return new Function('window', `${body}\nreturn { depthRoot, pageRoot, siteRoot, footerHref };`);
}

const build = loadRootHelpers();
const helper = p => build({ location: { pathname: p } });

const expected = [
  ['/index.html', '.', '.'],
  ['/', '.', '.'],
  ['/blog.html', '.', '.'],
  ['/polls.html', '.', '.'],
  ['/quotes.html', '.', '.'],
  ['/polls/weekly-ritual.html', '..', '..'],
  ['/blog-posts/why-modern-dating-feels-so-hard.html', '..', '..'],
  ['/bn/index.html', '.', '..'],
  ['/bn/', '.', '..'],
  ['/bn/valentines-day.html', '.', '..'],
  ['/bn/blog.html', '.', '..'],
];

for (const [pathname, wantPage, wantSite] of expected) {
  const got = helper(pathname);
  if (got.pageRoot() !== wantPage) problems.push(`${pathname}: pageRoot() = "${got.pageRoot()}", expected "${wantPage}"`);
  if (got.siteRoot() !== wantSite) problems.push(`${pathname}: siteRoot() = "${got.siteRoot()}", expected "${wantSite}"`);
}

// ---------- 2. crawl built output ----------
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

if (!fs.existsSync(dist)) {
  console.error(`No build output at ${dist}. Run "npm run build" first.`);
  process.exit(1);
}

const all = walk(dist);
const allSet = new Set(all.map(f => path.resolve(f)));

// Resolve a root-relative or relative URL the way the browser would, from `fromFile`.
function targetExists(fromFile, url) {
  const clean = url.split('#')[0].split('?')[0];
  if (!clean) return true;
  if (/^(https?:)?\/\//i.test(clean) || /^(mailto|tel):/i.test(clean)) return true;
  const base = clean.startsWith('/') ? path.join(dist, clean) : path.resolve(path.dirname(fromFile), clean);
  const candidates = [base, path.join(base, 'index.html')];
  return candidates.some(c => allSet.has(path.resolve(c)));
}

let linksChecked = 0;

for (const file of all.filter(f => f.endsWith('.html'))) {
  const html = fs.readFileSync(file, 'utf8');
  const rel = '/' + path.relative(dist, file).replace(/\\/g, '/');
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    linksChecked++;
    if (!targetExists(file, m[1])) problems.push(`${rel}: broken reference "${m[1]}"`);
  }
}

// A Bengali page should link to its Bengali sibling, not to the English page when
// a Bengali twin exists. This is invisible in the browser - the link works, it just
// quietly sends the reader out of their language.
const BENGALI_TWINS = new Set([
  'index.html', 'about.html', 'blog.html', 'calculator.html', 'polls.html',
  'privacy.html', 'valentines-day.html',
]);

function hasBengaliTwin(resolvedPath) {
  if (!resolvedPath.startsWith('/') || resolvedPath.startsWith('/bn/')) return false;
  return BENGALI_TWINS.has(path.posix.basename(resolvedPath));
}

for (const file of all.filter(f => f.endsWith('.html') && path.dirname(f).endsWith('bn'))) {
  const html = fs.readFileSync(file, 'utf8');
  const rel = '/' + path.relative(dist, file).replace(/\\/g, '/');
  const pageDir = path.posix.dirname(rel);
  // Anchor tags only: <link rel="alternate" hreflang> must keep pointing at English.
  for (const m of html.matchAll(/<a\b([^>]*?)\bhref="([^"]+)"([^>]*)>/g)) {
    const attributes = `${m[1]} ${m[3]}`;
    if (/\blang=["']en["']/i.test(attributes)) continue;
    const href = m[2].split('#')[0].split('?')[0];
    if (!href || /^(https?:)?\/\//i.test(href)) continue;
    const resolved = href.startsWith('/')
      ? path.posix.normalize(href)
      : path.posix.normalize(path.posix.join(pageDir, href));
    if (hasBengaliTwin(resolved)) {
      problems.push(`${rel}: link "${m[1]}" resolves to English ${resolved} but bn/${path.posix.basename(resolved)} exists`);
    }
  }
}

// ---------- 3. simulate the injected footer on every built page ----------
const FOOTER_PAGES = ['index.html', 'calculator.html', 'blog.html', 'polls.html',
  'quotes.html', 'valentines-day.html', 'about.html', 'privacy.html', 'contact.html'];

for (const file of all.filter(f => f.endsWith('.html'))) {
  const rel = '/' + path.relative(dist, file).replace(/\\/g, '/');
  const { pageRoot, siteRoot, footerHref } = build({ location: { pathname: rel } });
  for (const page of FOOTER_PAGES) {
    linksChecked++;
    const href = footerHref(page);
    if (!targetExists(file, href)) {
      problems.push(`${rel}: injected footer link "${href}" does not resolve`);
    }
  }
  linksChecked++;
  if (!targetExists(file, `${siteRoot()}/social-share.js`)) {
    problems.push(`${rel}: injected social-share.js "${siteRoot()}/social-share.js" does not resolve`);
  }
}

console.log(`Helpers checked: ${expected.length}`);
console.log(`Built files scanned: ${all.length}`);
console.log(`Links checked: ${linksChecked}`);

if (problems.length) {
  console.log(`\nPROBLEMS (${problems.length}):`);
  problems.slice(0, 40).forEach(p => console.log(' - ' + p));
  if (problems.length > 40) console.log(` ... and ${problems.length - 40} more`);
  process.exit(1);
}
console.log('\ninternal links: OK - no problems found.');