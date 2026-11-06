// Generates a branded cover/OG image for the Compatibility Quiz page.
// Output: public/assets/compatibility-quiz-cover.jpg (1200x630) and .webp.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'public', 'assets');

const WIDTH = 1200;
const HEIGHT = 630;
const MARGIN = 72;
const SERIF = "'Georgia', 'Times New Roman', 'Noto Serif', serif";
const SANS = "'Segoe UI', 'Helvetica Neue', Arial, 'Liberation Sans', sans-serif";

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function measureLine(text, size, weight) {
  const bold = weight >= 700 ? 1.05 : 1;
  let units = 0;
  for (const char of text) {
    if (char === ' ') units += 0.3;
    else if ("iljtf.,;:'|!?".includes(char)) units += 0.31;
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

function svg() {
  const title = 'Relationship Compatibility Quiz';
  const subtitle = 'Values, communication, conflict repair, affection, and shared direction';
  const kicker = 'COUPLE IN BOND · PRIVATE REFLECTION';
  const cta = '15 questions · Solo or as a pair · No sign-up';

  const maxTextWidth = WIDTH - MARGIN * 2 - 430;
  let size = 66;
  let lines = wrapLines(title, size, 700, maxTextWidth, 2);
  while (size > 44 && lines.length >= 2 && measureLine(lines[0], size, 700) > maxTextWidth) {
    size -= 2;
    lines = wrapLines(title, size, 700, maxTextWidth, 2);
  }
  const lineHeight = Math.round(size * 1.12);
  const textX = MARGIN + 6;
  // Nudged down ~2/3 character height so the "Relationship…" title sits lower.
  let y = 168 + Math.round(size * 0.67);

  const chipY = 520;
  const chips = ['Values', 'Communication', 'Conflict repair', 'Affection', 'Direction'];
  let chipX = textX;
  const chipParts = chips.map((label) => {
    const padX = 18;
    const w = Math.round(measureLine(label, 20, 700) + padX * 2);
    const g = `<g>
      <rect x="${chipX}" y="${chipY}" rx="18" ry="18" width="${w}" height="36" fill="rgba(255,255,255,0.72)" stroke="rgba(106,0,244,0.14)" />
      <text x="${chipX + w / 2}" y="${chipY + 24}" text-anchor="middle" font-family="${SANS}" font-size="20" font-weight="700" fill="#6a00f4">${escapeXml(label)}</text>
    </g>`;
    chipX += w + 10;
    return g;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff1f5"/>
      <stop offset="52%" stop-color="#f6efff"/>
      <stop offset="100%" stop-color="#ffe4ea"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ff4d6d"/>
      <stop offset="100%" stop-color="#6a00f4"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.96)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.82)"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#492256" flood-opacity="0.14"/>
    </filter>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <circle cx="1040" cy="120" r="210" fill="#ff4d6d" fill-opacity="0.10"/>
  <circle cx="1120" cy="520" r="190" fill="#6a00f4" fill-opacity="0.10"/>
  <circle cx="820" cy="560" r="120" fill="#ff4d6d" fill-opacity="0.08"/>

  <!-- decorative quiz/result cards -->
  <g filter="url(#shadow)">
    <rect x="760" y="118" width="360" height="392" rx="30" fill="url(#card)" stroke="rgba(255,77,109,0.18)"/>
  </g>
  <rect x="792" y="154" width="120" height="28" rx="14" fill="#fff1f5"/>
  <text x="852" y="173" text-anchor="middle" font-family="${SANS}" font-size="14" font-weight="800" letter-spacing="1.2" fill="#ff4d6d">QUIZ AREAS</text>

  ${['Values & goals', 'Communication', 'Conflict repair', 'Time & affection', 'Shared direction'].map((label, i) => {
    const yy = 214 + i * 58;
    const w = [78, 72, 86, 64, 74][i];
    return `
    <text x="792" y="${yy}" font-family="${SANS}" font-size="20" font-weight="700" fill="#291b2d">${escapeXml(label)}</text>
    <rect x="792" y="${yy + 14}" width="296" height="10" rx="5" fill="#f3e8ff"/>
    <rect x="792" y="${yy + 14}" width="${Math.round(296 * w / 100)}" height="10" rx="5" fill="url(#accent)" fill-opacity="0.78"/>`;
  }).join('')}

  <!-- Reflection card: kept clear of the QUIZ AREAS panel (QUIZ AREAS starts at x=760). -->
  <g filter="url(#shadow)">
    <rect x="480" y="392" width="250" height="118" rx="22" fill="rgba(255,255,255,0.96)" stroke="rgba(106,0,244,0.14)"/>
  </g>
  <text x="508" y="430" font-family="${SANS}" font-size="13" font-weight="800" letter-spacing="1.4" fill="#6a00f4">A REFLECTION</text>
  <text x="493" y="464" font-family="${SERIF}" font-size="30" font-weight="700" fill="#291b2d">Talk it through</text>
  <text x="508" y="490" font-family="${SANS}" font-size="16" font-weight="600" fill="#6f6573">together, kindly</text>

  <rect x="${MARGIN - Math.round(19 * 0.6)}" y="112" width="8" height="220" rx="4" fill="url(#accent)"/>
  <text x="${textX}" y="134" font-family="${SANS}" font-size="19" font-weight="800" letter-spacing="2.4" fill="#ff4d6d">${escapeXml(kicker)}</text>
  ${lines.map((line) => { const t = `<text x="${textX}" y="${y}" font-family="${SERIF}" font-size="${size}" font-weight="700" fill="#291b2d">${escapeXml(line)}</text>`; y += lineHeight; return t; }).join('')}
  <text x="${textX}" y="${y + 16}" font-family="${SANS}" font-size="24" font-weight="500" fill="#6f6573">${escapeXml(subtitle)}</text>
  <text x="${textX}" y="${y + 58}" font-family="${SANS}" font-size="19" font-weight="700" fill="#291b2d" fill-opacity="0.78">${escapeXml(cta)}</text>

  ${chipParts}
  <text x="${WIDTH - MARGIN}" y="${HEIGHT - 34}" text-anchor="end" font-family="${SANS}" font-size="18" font-weight="700" fill="#291b2d" fill-opacity="0.45">couplein.bond</text>
</svg>`;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const svgBuf = Buffer.from(svg());
  const jpg = path.join(outDir, 'compatibility-quiz-cover.jpg');
  const webp = path.join(outDir, 'compatibility-quiz-cover.webp');
  await sharp(svgBuf).jpeg({ quality: 88, mozjpeg: true }).toFile(jpg);
  await sharp(svgBuf).webp({ quality: 86 }).toFile(webp);
  console.log(`wrote ${path.relative(rootDir, jpg)}`);
  console.log(`wrote ${path.relative(rootDir, webp)}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
