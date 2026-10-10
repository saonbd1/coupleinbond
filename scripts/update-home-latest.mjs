// Refresh the "latest stories" list on the static homepages from the blog
// content collection. Picks the 5 newest posts by cardOrder (higher = newer)
// and rewrites the tight title-only list inside the hero aside on:
//   - public/index.html (English)
//   - bn/index.html     (Bengali source; copied to public/bn/ by copy-bn-static.mjs)
//
// The aside heading + icon + kicker stay untouched; only the list items and
// the "browse all" link are regenerated. Run via `npm run update:home-latest`
// (wired into prebuild) or directly: `node scripts/update-home-latest.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const blogDir = path.join(rootDir, 'src', 'content', 'blog');

const COUNT = 5;

const htmlEscape = (value = '') => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const frontmatterValue = (text, key) => {
  const m = text.match(new RegExp(`(?m)^${key}:\\s*"?([^"\\n]*)"?\\s*$`));
  return m ? m[1].trim() : '';
};

const posts = fs.readdirSync(blogDir)
  .filter((name) => name.endsWith('.md'))
  .map((name) => {
    const text = fs.readFileSync(path.join(blogDir, name), 'utf8');
    const head = text.slice(0, text.indexOf('\n---', 3));
    if (!head.startsWith('---\n')) throw new Error(`${name}: missing frontmatter fence`);
    const draft = /^draft:\s*true/m.test(head);
    return {
      slug: frontmatterValue(head, 'slug') || name.replace(/\.md$/, ''),
      cardTitle: frontmatterValue(head, 'cardTitle'),
      cardOrder: Number(frontmatterValue(head, 'cardOrder')) || 0,
      draft,
    };
  })
  .filter((p) => !p.draft && p.cardTitle && p.slug)
  .sort((a, b) => b.cardOrder - a.cardOrder)
  .slice(0, COUNT);

if (posts.length < COUNT) {
  throw new Error(`Expected at least ${COUNT} blog posts, found ${posts.length}`);
}

const listItems = (hrefPrefix) => posts
  .map((p) => `              <li><a href="${hrefPrefix}${htmlEscape(p.slug)}.html">${htmlEscape(p.cardTitle)}</a></li>`)
  .join('\n');

const listBlock = (hrefPrefix, linkHref, linkLabel) =>
  `<ul class="home-latest-list">\n${listItems(hrefPrefix)}\n            </ul>\n            <a class="blog-card-link" href="${linkHref}">${linkLabel}</a>`;

// Replace everything between the aside heading and </aside>, keeping the
// icon + kicker + heading intact and swapping the body for the fresh list.
const patchAside = (html, hrefPrefix, linkHref, linkLabel) => {
  const openTag = '<aside class="blog-feature-note home-latest-note"';
  const openIdx = html.indexOf(openTag);
  if (openIdx === -1) throw new Error('home-latest aside not found');
  const h2Close = html.indexOf('</h2>', openIdx);
  if (h2Close === -1) throw new Error('home-latest heading not found');
  const asideClose = html.indexOf('</aside>', h2Close);
  if (asideClose === -1) throw new Error('home-latest aside has no closing tag');
  const body = `\n${listBlock(hrefPrefix, linkHref, linkLabel)}\n          `;
  return html.slice(0, h2Close + '</h2>'.length) + body + html.slice(asideClose);
};

const targets = [
  {
    file: path.join(rootDir, 'public', 'index.html'),
    hrefPrefix: 'blog-posts/',
    linkHref: 'blog.html',
    linkLabel: 'Browse all stories →',
  },
  {
    file: path.join(rootDir, 'bn', 'index.html'),
    // BN homepage has no local copies of the daily companions, so link out
    // to the English posts (hreflang already pairs EN<->BN where pairs exist).
    hrefPrefix: '../blog-posts/',
    linkHref: '../blog.html',
    linkLabel: 'সব গল্প দেখুন →',
  },
];

for (const t of targets) {
  const html = fs.readFileSync(t.file, 'utf8');
  fs.writeFileSync(t.file, patchAside(html, t.hrefPrefix, t.linkHref, t.linkLabel));
  console.log(`Updated latest-stories list in ${path.relative(rootDir, t.file)} (${posts.length} posts)`);
}
