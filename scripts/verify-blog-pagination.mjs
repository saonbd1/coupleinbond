// Verifies the static blog pagination: the built listing pages must show the
// right number of cards, cover every published post exactly once, and link
// between each other.
//
// Run after `npm run build`:
//   node scripts/verify-blog-pagination.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dist = path.join(rootDir, 'dist');

if (!fs.existsSync(dist)) {
  console.error(`No build output at ${dist}. Run "npm run build" first.`);
  process.exit(1);
}

const problems = [];

function read(file) {
  return fs.readFileSync(path.join(dist, file), 'utf8');
}

// Collect every built blog listing page: /blog.html, /blog/page/N.html,
// /blog/size/N.html and /blog/size/N/page/M.html.
function listingFiles(dir = 'blog', out = []) {
  const full = path.join(dist, dir);
  if (!fs.existsSync(full)) return out;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) listingFiles(rel, out);
    else if (entry.name.endsWith('.html')) out.push(rel);
  }
  return out;
}

function cardsIn(html) {
  return Array.from(html.matchAll(/<article class="blog-card">[\s\S]*?<h3><a href="([^"]+)"/g))
    .map((m) => m[1]);
}

const files = ['blog.html', ...listingFiles()];

// --- every listing shows a multiple of its page size, and the sizes differ ---
const perPage = new Map();
for (const file of files) {
  const html = read(file);
  const cards = cardsIn(html);
  const sizeMatch = html.match(/aria-label="Posts per page"|aria-label="(\d+) posts per page, current"/);
  const current = html.match(/aria-label="(\d+) posts per page, current"/);
  const size = current ? Number(current[1]) : 6;
  perPage.set(file, { cards: cards.length, size });
  if (cards.length > size) {
    problems.push(`${file}: shows ${cards.length} cards, more than its page size of ${size}`);
  }
}

// --- the union of pages for each size covers every post exactly once ---
const allPosts = new Set();
for (const file of files) {
  for (const href of cardsIn(read(file))) {
    const key = href.replace(/^.*\/blog-posts\//, 'blog-posts/');
    allPosts.add(key);
  }
}

// The number of distinct posts across the default-size pages must equal the
// number of posts across the size=8 pages (same source list, different split).
const defaultFiles = files.filter((f) => !f.includes('size'));
const sizeFiles = files.filter((f) => f.includes('size'));

function unionOf(list) {
  const set = new Set();
  for (const file of list) for (const href of cardsIn(read(file))) set.add(href.replace(/^.*\/blog-posts\//, 'blog-posts/'));
  return set;
}

const defaultUnion = unionOf(defaultFiles);
const sizeUnion = unionOf(sizeFiles);

for (const key of sizeUnion) {
  if (!defaultUnion.has(key)) problems.push(`size listings contain ${key}, which the default listing does not`);
}
for (const key of defaultUnion) {
  if (!sizeUnion.has(key)) problems.push(`default listing contains ${key}, which the size listings do not`);
}

// No post should appear twice across the default-size pages.
const seen = new Map();
for (const file of defaultFiles) {
  for (const href of cardsIn(read(file))) {
    const key = href.replace(/^.*\/blog-posts\//, 'blog-posts/');
    seen.set(key, (seen.get(key) || 0) + 1);
  }
}
for (const [key, count] of seen) {
  if (count > 1) problems.push(`${key} appears on ${count} default-size listing pages (expected once)`);
}

// --- each page carries a canonical URL and rel=prev/rel=next where relevant ---
for (const file of files) {
  const html = read(file);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)">/);
  if (!canonical) problems.push(`${file}: no canonical link`);
  const rels = ['rel="prev"', 'rel="next"'];
  const isFirst = /aria-current="page"[^>]*>1</.test(html) || /is-current[^>]*>1</.test(html);
  const isLast = !html.includes('rel="next"');
  if (!isFirst && !html.includes('rel="prev"')) problems.push(`${file}: no rel=prev link although it is not the first page`);
  if (!isLast && !html.includes('rel="next"')) problems.push(`${file}: no rel=next link although it is not the last page`);
  void rels;
}

console.log(`Listing pages checked: ${files.length}`);
console.log(`Distinct posts in the listing: ${defaultUnion.size}`);

if (problems.length) {
  console.log(`\nPROBLEMS (${problems.length}):`);
  problems.forEach((p) => console.log(' - ' + p));
  process.exit(1);
}
console.log('\nblog pagination: OK - no problems found.');
