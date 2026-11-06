// Poll OG/share image generator for Couple in Bond.
//
// Daily polls (scripts/daily_polls.py) ship without per-poll share images and
// historically pointed ogImage at the generic polls-hero-illustration.png. This
// script renders a branded 1200x630 (1.91:1) JPG for each poll and patches its
// frontmatter ogImage/ogImageAlt to the generated asset.
//
// Self-contained (SVG + sharp), no network, so it runs on the GitHub Actions
// ubuntu runner used by .github/workflows/daily-polls.yml.
//
// Usage:
//   node scripts/poll-og-generator.mjs                    # polls missing a share image / using the generic hero
//   node scripts/poll-og-generator.mjs --slug <id>        # one poll
//   node scripts/poll-og-generator.mjs --all              # every poll
//   node scripts/poll-og-generator.mjs --force            # regenerate images even if present
//   node scripts/poll-og-generator.mjs --check            # report gaps, exit 1
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const pollsDir = path.join(rootDir, 'src', 'content', 'polls');
const outDirDefault = path.join(rootDir, 'public', 'assets', 'polls');

const SITE = 'https://couplein.bond';
const GENERIC_HERO = `${SITE}/assets/polls-hero-illustration.png`;

const WIDTH = 1200;
const HEIGHT = 630;
const MARGIN = 72;
// Single-quoted fallbacks inside XML attribute values (double quotes would
// terminate the attribute and librsvg/sharp would reject the SVG).
const SERIF = "'Georgia', 'Times New Roman', 'Noto Serif', serif";
const SANS = "'Segoe UI', 'Helvetica Neue', Arial, 'Liberation Sans', sans-serif";

const PALETTES = {
  Connection: { from: '#ffe4ea', to: '#ffc9d8', accent: '#ff4d6d', deep: '#6a00f4', ink: '#291b2d', sub: '#6f6573' },
  Relationships: { from: '#f3e8ff', to: '#dcc6ff', accent: '#6a00f4', deep: '#ff4d6d', ink: '#291b2d', sub: '#6f6573' },
  'Date night': { from: '#2a1040', to: '#5b1a72', accent: '#ff4d6d', deep: '#ffb3c6', ink: '#ffffff', sub: 'rgba(255,255,255,0.78)' },
  Seasonal: { from: '#fff0e6', to: '#ffd9c2', accent: '#e0492f', deep: '#6a00f4', ink: '#291b2d', sub: '#6f6573' },
  Friendship: { from: '#e8f4ff', to: '#c9e2ff', accent: '#2f6fe0', deep: '#6a00f4', ink: '#291b2d', sub: '#6f6573' },
  default: { from: '#fff1f5', to: '#f6efff', accent: '#ff4d6d', deep: '#6a00f4', ink: '#291b2d', sub: '#6f6573' },
};

function parseArgs(argv) {
  const options = { slug: null, all: false, force: false, check: false, out: outDirDefault };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--all') options.all = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--check') options.check = true;
    else if (arg === '--slug') options.slug = argv[++i];
    else if (arg === '--out') options.out = argv[++i];
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return options;
}

function unquote(value = '') {
  const trimmed = String(value).trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function readPoll(name) {
  const slug = name.replace(/\.md$/, '');
  const file = path.join(pollsDir, name);
  const raw = fs.readFileSync(file, 'utf8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error(`${name}: missing frontmatter fence`);
  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!field) continue;
    frontmatter[field[1]] = unquote(field[2]);
  }
  return { slug, name, file, raw, frontmatter, body: match[2], frontmatterText: match[1] };
}

function listPolls() {
  return fs.readdirSync(pollsDir)
    .filter((name) => name.endsWith('.md'))
    .map(readPoll);
}

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function hashText(text) {
  let hash = 7;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash;
}

function measureLine(text, size, weight) {
  const bold = weight >= 700 ? 1.05 : 1;
  let units = 0;
  for (const char of text) {
    if (char === ' ') units += 0.3;
    else if ('iljtf.,;:\'|!?'.includes(char)) units += 0.31;
    else if ('mwMW'.includes(char)) units += 0.95;
    else if (/[A-Z]/.test(char)) units += 0.72;
    else units += 0.56;
  }
  return units * size * bold;
}

function wrapLines(text, size, weight, maxWidth, maxLines) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (measureLine(candidate, size, weight) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

function shareSvg({ question, topic }) {
  const palette = PALETTES[topic] || PALETTES.default;
  const seed = hashText(`${topic}|${question}`);
  const maxTextWidth = WIDTH - MARGIN * 2 - 40;

  let size = 62;
  let lines = wrapLines(question, size, 700, maxTextWidth, 4);
  while (size > 38 && lines.length >= 4) {
    size -= 2;
    lines = wrapLines(question, size, 700, maxTextWidth, 4);
  }
  const lineHeight = Math.round(size * 1.16);
  const titleHeight = lines.length * lineHeight;

  const kicker = `${topic || 'Relationship poll'} · Couple in Bond`;
  const kickerSize = 20;
  const footerSize = 18;
  const gap = 18;
  const textX = MARGIN + 30;
  const barX = MARGIN;
  const blockHeight = kickerSize + gap + titleHeight + gap + footerSize;
  const bottom = HEIGHT - MARGIN - 18;
  const top = Math.max(MARGIN + 24, bottom - blockHeight);

  const ringX = 900 + (seed % 170);
  const ringY = 140 + ((seed >> 4) % 120);
  const ringR = 170 + ((seed >> 8) % 80);
  const discX = 810 + ((seed >> 3) % 250);
  const discY = 320 + ((seed >> 6) % 170);
  const discR = 55 + ((seed >> 10) % 55);

  const parts = [];
  parts.push(`<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.from}"/>
      <stop offset="100%" stop-color="${palette.to}"/>
    </linearGradient>
    <linearGradient id="badge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.accent}"/>
      <stop offset="100%" stop-color="${palette.deep}"/>
    </linearGradient>
  </defs>`);
  parts.push(`<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>`);
  parts.push(`<circle cx="${ringX}" cy="${ringY}" r="${ringR}" fill="none" stroke="${palette.accent}" stroke-opacity="0.24" stroke-width="24"/>`);
  parts.push(`<circle cx="${discX}" cy="${discY}" r="${discR}" fill="${palette.accent}" fill-opacity="0.14"/>`);
  parts.push(`<circle cx="${discX}" cy="${discY}" r="${Math.round(discR * 0.42)}" fill="url(#badge)" fill-opacity="0.88"/>`);
  parts.push(`<rect x="${barX}" y="${top + 2}" width="9" height="${Math.max(40, blockHeight - footerSize - gap - 4)}" fill="url(#badge)" rx="4"/>`);

  parts.push(`<text x="${textX}" y="${top + kickerSize - 5}" font-family="${SANS}" font-size="${kickerSize}" font-weight="700" letter-spacing="2.2" fill="${palette.accent}">${escapeXml(kicker.toUpperCase())}</text>`);

  let cursor = top + kickerSize + gap;
  for (const line of lines) {
    parts.push(`<text x="${textX}" y="${cursor + Math.round(size * 0.82)}" font-family="${SERIF}" font-size="${size}" font-weight="700" fill="${palette.ink}">${escapeXml(line)}</text>`);
    cursor += lineHeight;
  }

  cursor = Math.min(cursor + gap, bottom - footerSize + 6);
  parts.push(`<text x="${textX}" y="${cursor}" font-family="${SANS}" font-size="${footerSize}" font-weight="400" fill="${palette.sub}">${escapeXml('couplein.bond · Vote, compare, and start a better conversation')}</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${parts.join('')}</svg>`;
}

function shareImageUrl(slug) {
  return `${SITE}/assets/polls/${slug}-share.jpg`;
}

function shareAlt(question) {
  const q = String(question || '').trim();
  return q ? `Share card for the relationship poll: ${q}` : 'Share card for a Couple in Bond relationship poll';
}

function patchFrontmatter(poll, { ogImage, ogImageAlt }) {
  let text = poll.frontmatterText;
  const upsert = (key, value) => {
    const line = `${key}: ${JSON.stringify(value)}`;
    const re = new RegExp(`^${key}:.*$`, 'm');
    if (re.test(text)) text = text.replace(re, line);
    else text = `${text}\n${line}`;
  };
  upsert('ogImage', ogImage);
  upsert('ogImageAlt', ogImageAlt);
  return `---\n${text.trimEnd()}\n---\n${poll.body}`;
}

function needsUpdate(poll) {
  const og = poll.frontmatter.ogImage || '';
  const expected = shareImageUrl(poll.slug);
  // Replace the generic hero and any non-share/per-poll-mismatched ref with the
  // deterministic per-poll share image (legacy polls that already point at their
  // own *-share.jpg keep that value because it equals expected).
  return og === GENERIC_HERO || og !== expected;
}

async function renderShareImage(poll, outDir) {
  const question = poll.frontmatter.question || poll.frontmatter.pageTitle || poll.slug;
  const topic = poll.frontmatter.topic || 'Relationship poll';
  const outPath = path.join(outDir, `${poll.slug}-share.jpg`);
  await sharp(Buffer.from(shareSvg({ question, topic })))
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(outPath);
  return outPath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log('node scripts/poll-og-generator.mjs [--slug <id>] [--all] [--force] [--check] [--out <dir>]');
    return;
  }

  const polls = listPolls();
  if (!polls.length) throw new Error(`no polls found in ${pollsDir}`);

  const targets = options.all
    ? polls
    : options.slug
      ? [polls.find((p) => p.slug === options.slug) || (() => { throw new Error(`no poll with slug "${options.slug}"`); })()]
      : polls.filter((p) => options.force || needsUpdate(p));

  if (options.check) {
    const missing = polls.filter((p) => {
      const outPath = path.join(options.out, `${p.slug}-share.jpg`);
      return needsUpdate(p) || !fs.existsSync(outPath);
    });
    if (missing.length) {
      console.error(`${missing.length} poll(s) missing a correct OG share image/frontmatter:`);
      for (const p of missing) console.error(`  ${p.slug}`);
      process.exit(1);
    }
    console.log(`OK: all ${polls.length} polls have a per-poll OG share image.`);
    return;
  }

  fs.mkdirSync(options.out, { recursive: true });
  let generated = 0;
  let patched = 0;
  for (const poll of targets) {
    const outPath = path.join(options.out, `${poll.slug}-share.jpg`);
    if (options.force || !fs.existsSync(outPath)) {
      await renderShareImage(poll, options.out);
      generated += 1;
    }
    const ogImage = shareImageUrl(poll.slug);
    const ogImageAlt = shareAlt(poll.frontmatter.question || poll.frontmatter.pageTitle);
    if (poll.frontmatter.ogImage !== ogImage || poll.frontmatter.ogImageAlt !== ogImageAlt) {
      fs.writeFileSync(poll.file, patchFrontmatter(poll, { ogImage, ogImageAlt }));
      patched += 1;
    }
    console.log(`  ${poll.slug} -> ${path.relative(rootDir, outPath)}`);
  }
  console.log(`Poll OG images ready: ${targets.length} target(s), ${generated} generated, ${patched} frontmatter patched.`);
}

if (process.argv[1] === __filename) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

export { renderShareImage, listPolls };
