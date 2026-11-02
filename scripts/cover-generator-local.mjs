// Blog cover generator.
//
// Picks a random photo from a local sample directory, typesets the blog post's
// title over it with the site's brand palette, and writes a 1200x675 cover.
//
// Usage
// -----
//   node scripts/cover-generator.mjs                          # newest post, random photo
//   node scripts/cover-generator.mjs --slug quality-time-mean-20261011-companion
//   node scripts/cover-generator.mjs --image couple-beach-wide  # pin the photo
//   node scripts/cover-generator.mjs --all                     # every post, one cover each
//   node scripts/cover-generator.mjs --out public/assets/blog  # write into the site
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const IMAGE_DIR = process.env.CIB_IMAGE_DIR || 'C:\\Users\\saonb\\blog-image';
const BLOG_DIR = path.join(rootDir, 'src', 'content', 'blog');
const DEFAULT_OUT = path.join(rootDir, 'generated', 'covers');

// public/blog.css
const BRAND = {
  primary: '#ff4d6d',
  secondary: '#6a00f4',
  ink: '#291b2d',
  muted: '#6f6573',
  white: '#ffffff',
};

const WIDTH = 1200;
const HEIGHT = 675;
const MARGIN = 72;
const FONT_STACK = 'Segoe UI, SegoeUI, Helvetica Neue, Arial, sans-serif';

function parseArgs(argv) {
  const options = { slug: null, image: null, all: false, out: DEFAULT_OUT };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--all') options.all = true;
    else if (arg === '--slug') options.slug = argv[++i];
    else if (arg === '--image') options.image = argv[++i];
    else if (arg === '--out') options.out = argv[++i];
    else if (arg === '--help' || arg === '-h') options.help = true;
  }
  return options;
}

function readFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return null;
  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!field) continue;
    const [, key, value] = field;
    frontmatter[key] = value.replace(/^["']|["']$/g, '').trim();
  }
  return frontmatter;
}

function listPosts() {
  return fs.readdirSync(BLOG_DIR)
    .filter((name) => name.endsWith('.md'))
    .map((name) => {
      const slug = name.replace(/\.md$/, '');
      const frontmatter = readFrontmatter(fs.readFileSync(path.join(BLOG_DIR, name), 'utf8')) || {};
      return { slug, file: name, frontmatter, mtime: fs.statSync(path.join(BLOG_DIR, name)).mtimeMs };
    });
}

function listSampleCovers() {
  if (!fs.existsSync(IMAGE_DIR)) {
    throw new Error(`sample image directory not found: ${IMAGE_DIR}`);
  }
  const covers = fs.readdirSync(IMAGE_DIR)
    .filter((name) => name.toLowerCase().endsWith('-cover.jpg'))
    .sort();
  if (!covers.length) throw new Error(`no *-cover.jpg files in ${IMAGE_DIR}`);
  return covers.map((name) => ({
    key: name.replace(/-cover\.jpg$/i, ''),
    file: path.join(IMAGE_DIR, name),
  }));
}

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function titleCase(slug) {
  return slug.split('-').filter(Boolean)
    .map((word) => (word.length > 3 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

// Width of a single line at a given size, tuned for Segoe UI. Good enough for
// wrapping without shipping a font metrics parser.
function measureLine(text, fontSize, weight) {
  const bold = weight >= 700 ? 1.045 : 1;
  let total = 0;
  for (const char of text) {
    if (char === ' ') total += 0.3;
    else if ('iljtf.,;:\'|!'.includes(char)) total += 0.31;
    else if ('mwMW'.includes(char)) total += 0.94;
    else if (char === char.toUpperCase() && /[A-Z]/.test(char)) total += 0.72;
    else total += 0.55;
  }
  return total * fontSize * bold;
}

function wrapTitle(title, fontSize, weight, maxWidth) {
  const words = title.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measureLine(candidate, fontSize, weight) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function gradientScrim() {
  const stops = [];
  for (let i = 0; i <= 10; i += 1) {
    const at = i / 10;
    // Transparent above 42%, then a deepening ink wash to the bottom edge.
    const opacity = at < 0.42 ? 0 : Math.round((at - 0.42) / 0.58 * 200) / 255;
    stops.push(`<stop offset="${(at * 100).toFixed(0)}%" stop-color="#14091a" stop-opacity="${opacity.toFixed(3)}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">${stops.join('')}</linearGradient>
    <linearGradient id="scrimLeft" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#14091a" stop-opacity="0.55"/>
      <stop offset="46%" stop-color="#14091a" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#scrim)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#scrimLeft)"/>
</svg>`;
}

function overlaySvg({ kicker, lines, caption }) {
  const maxSize = 62;
  const minSize = 38;
  let titleSize = maxSize;
  let titleLines = wrapTitle(lines.join(' '), titleSize, 700, WIDTH - MARGIN * 2 - 48);
  while (titleSize > minSize && titleLines.length > 2) {
    titleSize -= 4;
    titleLines = wrapTitle(lines.join(' '), titleSize, 700, WIDTH - MARGIN * 2 - 48);
  }

  const lineHeight = Math.round(titleSize * 1.14);
  const titleBlockHeight = titleLines.length * lineHeight;
  const kickerHeight = 26;
  const captionHeight = 24;
  const gap = 14;
  const totalHeight = kickerHeight + gap + titleBlockHeight + gap + captionHeight;
  const bottom = HEIGHT - MARGIN;
  const top = bottom - totalHeight;

  const barX = MARGIN;
  const textX = MARGIN + 22;
  let cursor = top;

  const parts = [];
  const shadow = 'paint-order="stroke" stroke="#14091a" stroke-width="3" stroke-linejoin="round"';

  parts.push(`<rect x="${barX}" y="${top + 4}" width="8" height="${totalHeight - captionHeight - gap - 8}" fill="${BRAND.primary}"/>`);

  parts.push(`<text x="${textX}" y="${cursor + kickerHeight - 5}" font-family="${FONT_STACK}" font-size="19" font-weight="700" letter-spacing="2.2" fill="${BRAND.primary}" ${shadow}>${escapeXml(kicker.toUpperCase())}</text>`);
  cursor += kickerHeight + gap;

  for (const line of titleLines) {
    parts.push(`<text x="${textX}" y="${cursor + titleSize * 0.82}" font-family="${FONT_STACK}" font-size="${titleSize}" font-weight="700" fill="${BRAND.white}" ${shadow}>${escapeXml(line)}</text>`);
    cursor += lineHeight;
  }

  cursor += gap;
  parts.push(`<text x="${textX}" y="${cursor + captionHeight - 7}" font-family="${FONT_STACK}" font-size="17" font-weight="400" fill="rgba(255,255,255,0.78)" ${shadow}>${escapeXml(caption)}</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${parts.join('')}</svg>`;
}

async function generate({ post, sample, outDir }) {
  const title = post.frontmatter.title || post.frontmatter.pageTitle || titleCase(post.slug);
  const kicker = [post.frontmatter.section || 'Relationships', post.frontmatter.kicker?.split('·')[1]?.trim() || '']
    .filter(Boolean).join('  ·  ');
  const caption = [post.frontmatter.author || 'Couple in Bond Editorial', post.frontmatter.publishedLabel || post.frontmatter.datePublished || '']
    .filter(Boolean).join('  ·  ');

  const cover = await sharp(sample.file)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: sharp.strategy.attention })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  const composed = await sharp(cover)
    .composite([
      { input: Buffer.from(gradientScrim()) },
      { input: Buffer.from(overlaySvg({ kicker, lines: [title], caption })) },
    ])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();

  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${post.slug}-cover.jpg`);
  await fs.promises.writeFile(outPath, composed);
  return { outPath, title, sampleKey: sample.key };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log('node scripts/cover-generator.mjs [--slug <slug>] [--image <key>] [--all] [--out <dir>]');
    return;
  }

  const samples = listSampleCovers();
  const posts = listPosts();
  if (!posts.length) throw new Error(`no posts found in ${BLOG_DIR}`);

  const targets = options.all
    ? posts
    : [options.slug
      ? posts.find((post) => post.slug === options.slug) || (() => { throw new Error(`no post with slug "${options.slug}"`); })()
      : posts.slice().sort((a, b) => b.mtime - a.mtime)[0]];

  for (const post of targets) {
    const sample = options.image
      ? samples.find((entry) => entry.key === options.image) || (() => { throw new Error(`no sample cover with key "${options.image}"`); })()
      : samples[Math.floor(Math.random() * samples.length)];
    const result = await generate({ post, sample, outDir: options.out });
    console.log(`${result.sampleKey}  ->  ${path.relative(rootDir, result.outPath)}  (${result.title})`);
  }
}

if (process.argv[1] === __filename) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

export { generate as generateCover, listPosts, listSampleCovers };
