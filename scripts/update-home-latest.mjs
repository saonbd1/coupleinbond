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
  const m = text.match(new RegExp(`^${key}:\\s*"?([^"\n]*)"?\\s*$`, 'm'));
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

// Rebuild the whole aside inner content (idempotent): icon + kicker +
// heading stay, old image/excerpt/CTA are dropped and replaced by the
// fresh 5-title list + "browse all" link. The EN and BN asides have
// different inner wrappers, so each target declares its own builder.
const asideInner = (cfg, hrefPrefix, linkHref, linkLabel) => {
  const list = posts
    .map((p) => {
      const href = `${hrefPrefix}${htmlEscape(p.slug)}.html`;
      const langAttr = cfg.postLang ? ` lang="${cfg.postLang}"` : '';
      return `              <li><a href="${href}"${langAttr}>${htmlEscape(p.cardTitle)}</a></li>`;
    })
    .join('\n');
  const listHtml = `<ul class="home-latest-list">\n${list}\n            </ul>\n            <a class="blog-card-link" href="${linkHref}">${linkLabel}</a>`;
  if (cfg.wrapper === 'body') {
    return `\n            <div class="home-latest-body">\n              <div class="blog-feature-icon" aria-hidden="true">✦</div>\n              <div class="blog-kicker home-latest-kicker">${cfg.kicker}</div>\n              <h2 id="home-latest-title">${cfg.heading}</h2>\n${listHtml}\n            </div>\n          `;
  }
  return `\n            <div class="blog-feature-icon" aria-hidden="true">✦</div>\n            <div class="blog-kicker home-latest-kicker">${cfg.kicker}</div>\n            <h2 id="home-latest-title">${cfg.heading}</h2>\n${listHtml}\n          `;
};

const patchAside = (html, cfg) => {
  const openTag = '<aside class="blog-feature-note home-latest-note"';
  const openIdx = html.indexOf(openTag);
  if (openIdx === -1) throw new Error('home-latest aside not found');
  const tagEnd = html.indexOf('>', openIdx);
  if (tagEnd === -1) throw new Error('home-latest aside tag never closes');
  const asideClose = html.indexOf('</aside>', tagEnd);
  if (asideClose === -1) throw new Error('home-latest aside has no closing tag');
  return (
    html.slice(0, tagEnd + 1) +
    asideInner(cfg, cfg.hrefPrefix, cfg.linkHref, cfg.linkLabel) +
    html.slice(asideClose)
  );
};

const targets = [
  {
    file: path.join(rootDir, 'public', 'index.html'),
    hrefPrefix: 'blog-posts/',
    linkHref: 'blog.html',
    linkLabel: 'Browse all stories →',
    kicker: 'Fresh from the blog · 5 latest stories',
    heading: 'Start with something recent.',
  },
  {
    file: path.join(rootDir, 'bn', 'index.html'),
    // BN homepage has no local copies of the daily companions, so post links
    // point out to the English posts (marked lang="en" to satisfy the BN
    // twin-link validator). The "browse all" link stays on the BN blog.
    wrapper: 'body',
    hrefPrefix: '../blog-posts/',
    linkHref: 'blog.html',
    linkLabel: 'সব গল্প দেখুন →',
    postLang: 'en',
    kicker: 'ব্লগ থেকে · সাম্প্রতিক ৫টি গল্প',
    heading: 'সাম্প্রতিক গল্প দিয়ে শুরু করুন।',
  },
];

for (const t of targets) {
  const html = fs.readFileSync(t.file, 'utf8');
  fs.writeFileSync(t.file, patchAside(html, t));
  console.log(`Updated latest-stories list in ${path.relative(rootDir, t.file)} (${posts.length} posts)`);
}
