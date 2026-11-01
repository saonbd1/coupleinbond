// Verifies the site's social links: the footer "Follow along" row and the
// article share row must offer Facebook and Instagram only, and both must point
// at the brand profiles rather than a bare platform homepage. X/TikTok controls
// are deliberately not part of the brand, so their presence fails the check.
//
// Run standalone:  node scripts/verify-social-links.mjs
// Or as part of:   npm run validate:release
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

const FACEBOOK = 'https://facebook.com/coupleinbond';
const INSTAGRAM = 'https://instagram.com/coupleinbond';
const FACEBOOK_SHARE = 'https://www.facebook.com/sharer/sharer.php?u=';
const FORBIDDEN = /(?:^|\/\/)(?:[a-z0-9-]+\.)*(?:tiktok\.com|x\.com|twitter\.com)(?:\/|$)/i;

const problems = [];

function render(scriptFile, html) {
  const code = fs.readFileSync(path.join(publicDir, scriptFile), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://couplein.bond/blog-posts/sample.html' });
  dom.window.eval(code);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  return dom.window.document;
}

const articlePage = `<!doctype html><html><head><link rel="canonical" href="https://couplein.bond/blog-posts/sample.html"></head>
<body><main><article class="article-shell"><h1>Sample post</h1><footer class="article-footer">Footnote</footer></article></main>
<footer class="blog-footer"></footer></body></html>`;

// --- footer "Follow along" row ---
const footerDoc = render('social-icons.js', articlePage);
const footerLinks = [...footerDoc.querySelectorAll('.social-link')];
const footerHrefs = footerLinks.map((link) => link.getAttribute('href'));

if (footerLinks.length !== 2) problems.push(`footer social row should have 2 icons, found ${footerLinks.length}`);
if (footerHrefs[0] !== FACEBOOK) problems.push(`footer Facebook link is "${footerHrefs[0]}", expected "${FACEBOOK}"`);
if (footerHrefs[1] !== INSTAGRAM) problems.push(`footer Instagram link is "${footerHrefs[1]}", expected "${INSTAGRAM}"`);
for (const link of footerLinks) {
  const label = link.getAttribute('aria-label') || '';
  const href = link.getAttribute('href') || '';
  if (!label) problems.push('footer social link is missing an aria-label');
  if (FORBIDDEN.test(href)) problems.push(`footer still links to a retired network: ${href}`);
  if (link.getAttribute('target') !== '_blank' || !(link.getAttribute('rel') || '').includes('noopener')) {
    problems.push(`footer ${label} link should open in a new tab with rel=noopener`);
  }
  if (!link.querySelector('svg')) problems.push(`footer ${label} link is missing its icon`);
}

// --- article "Share this page" row ---
const shareDoc = render('social-share.js', articlePage);
const shareLinks = [...shareDoc.querySelectorAll('.site-share-link')];
const shareHrefs = shareLinks.map((link) => link.getAttribute('href') || '');

if (shareLinks.length !== 2) problems.push(`article share row should have 2 links, found ${shareLinks.length}`);
if (!shareHrefs[0]?.startsWith(FACEBOOK_SHARE)) problems.push(`share row Facebook link is "${shareHrefs[0]}", expected the sharer.php URL`);
if (shareHrefs[1] !== INSTAGRAM) problems.push(`share row Instagram link is "${shareHrefs[1]}", expected "${INSTAGRAM}"`);
if (!shareHrefs[0]?.includes(encodeURIComponent('https://couplein.bond/blog-posts/sample.html'))) {
  problems.push('share row Facebook URL does not carry the canonical page URL');
}
for (const href of shareHrefs) {
  if (FORBIDDEN.test(href)) problems.push(`share row still links to a retired network: ${href}`);
}

// --- poll share row (labels are plain text, so check the source list) ---
const pollScript = fs.readFileSync(path.join(publicDir, 'poll-detail.js'), 'utf8');
for (const label of ['["X"', '["TikTok"', 'twitter.com/intent', 'x.com/intent']) {
  if (pollScript.includes(label)) problems.push(`poll share row still offers a retired network (${label})`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log(`social links: OK — footer ${footerHrefs.join(', ')}; share ${shareHrefs.join(', ')}`);
