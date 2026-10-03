/**
 * Quote card generator.
 *
 * Reads data/quotes.csv, renders one card image per row using a template from
 * quote-templates/, and injects the matching markup into public/quotes.html.
 *
 * Safe to re-run: a card is only rewritten when its row content or template
 * changed, so repeat runs produce no diffs and no duplicates.
 *
 * Usage:
 *   node scripts/generate-quote-cards.mjs            # render + inject
 *   node scripts/generate-quote-cards.mjs --check    # fail if stale, write nothing
 *
 * Env overrides (for probing without touching the live page):
 *   QUOTES_CSV, QUOTES_OUT, QUOTES_HASH; QUOTES_PAGES=- disables injection
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSV = process.env.QUOTES_CSV ? path.resolve(process.env.QUOTES_CSV) : path.join(root, "data", "quotes.csv");
const TEMPLATE_DIR = path.join(root, "quote-templates");
const OUT_DIR = process.env.QUOTES_OUT ? path.resolve(process.env.QUOTES_OUT) : path.join(root, "public", "assets", "quotes");
const pagesRaw = process.env.QUOTES_PAGES;
const PAGES = pagesRaw === undefined
  ? [path.join(root, "public", "quotes.html")]
  : pagesRaw
      .split(path.delimiter)
      .map(p => p.trim())
      .filter(p => p && p !== "-")
      .map(p => path.resolve(root, p));
const START = "<!-- QUOTE_CARDS:START -->";
const END = "<!-- QUOTE_CARDS:END -->";

const checkOnly = process.argv.includes("--check");
const problems = [];

/* ---------- CSV ---------- */

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift().map(h => h.trim());
  return rows
    .filter(r => r.some(c => c.trim() !== ""))
    .map(r => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

/* ---------- Templates ---------- */

const templates = fs.readdirSync(TEMPLATE_DIR)
  .filter(f => f.endsWith(".json"))
  .sort()
  .map(f => JSON.parse(fs.readFileSync(path.join(TEMPLATE_DIR, f), "utf8")));

if (!templates.length) throw new Error("No templates found in quote-templates/");

/* ---------- Text layout ---------- */


const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const isBengali = s => /[\u0980-\u09FF]/.test(s);

// Bengali glyphs are wider than Latin ones; measure per script so wrapping is stable.
function charWidth(ch) {
  if (/[\u0980-\u09FF]/.test(ch)) return 0.62;
  if (/[A-Z]/.test(ch)) return 0.58;
  if (/[iljt.,!?'"()]/.test(ch)) return 0.34;
  return 0.52;
}

function wrap(text, maxUnits) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    const units = [...candidate].reduce((s, c) => s + charWidth(c), 0);
    if (units <= maxUnits || !line) line = candidate;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function layout(text, { height, fontSize, maxUnits, lineGap = 1.32 }) {
  let size = fontSize;
  let lines = wrap(text, maxUnits);
  // Shrink until the block fits the canvas, so a long quote never overflows.
  const maxLines = Math.floor((height * 0.52) / (size * lineGap));
  while (lines.length > maxLines && size > 22) {
    size -= 2;
    lines = wrap(text, maxUnits * (size / fontSize));
  }
  return { lines, size };
}

/* ---------- Markup ---------- */

const templateWidth = t => Number((t.svg.match(/width="(\d+)"/) || [])[1] || 1080);
const templateHeight = t => Number((t.svg.match(/height="(\d+)"/) || [])[1] || 1080);

function cardMarkup(quote, order, template, imageFile) {
  const alt = `Quote card: ${quote.quote_text}${quote.author ? ` - ${quote.author}` : ""}`;
  const moodLabel = template.mood.charAt(0).toUpperCase() + template.mood.slice(1);
  const caption = quote.author ? `${moodLabel} - ${quote.author}` : moodLabel;
  const n = String(order).padStart(2, "0");
  const img = `assets/quotes/${imageFile}`;
  const loading = order === 1 ? `fetchpriority="high"` : `loading="lazy" decoding="async"`;

  return (
    `<article class="quote-card" data-quote-card data-mood="${esc(template.mood)}">` +
    `<a class="quote-card__link" data-lightbox-trigger href="${img}" target="_blank" rel="noopener noreferrer nofollow"` +
    ` data-image-alt="${esc(alt)}" data-caption="${esc(caption)}">` +
    `<img src="${img}" alt="${esc(alt)}" width="${templateWidth(template)}" height="${templateHeight(template)}" ${loading}>` +
    `<span class="quote-card__open">View full size</span></a>` +
    `<div class="quote-card__body">` +
    `<p class="quote-card__text">${esc(quote.quote_text)}</p>` +
    (quote.author ? `<p class="quote-card__author">— ${esc(quote.author)}</p>` : "") +
    `<div class="quote-card__meta"><span class="quote-card__number">${n}</span>` +
    `<button class="quote-card__share" type="button" data-share-card data-share-image="${img}"` +
    ` data-share-text="${esc(quote.quote_text)}" data-share-author="${esc(quote.author || "")}"` +
    ` aria-label="Share this quote card on social media">Share</button>` +
    `<span class="quote-card__mood">${esc(template.mood)}</span></div>` +
    `</div></article>`
  );
}

/* ---------- Card rendering ---------- */

function renderCard(quote, template) {
  const openTag = template.svg.match(/<svg[^>]*>/)[0];
  const w = Number((openTag.match(/width="(\d+)"/) || [])[1] || 1080);
  const h = Number((openTag.match(/height="(\d+)"/) || [])[1] || 1350);
  const isBn = isBengali(quote.quote_text);
  const font = isBn ? "vrinda" : "Georgia";
  const baseFont = isBn ? 54 : 62;
  const author = quote.author || "";

  const quoteSize = w <= 1100 && h <= 1100 ? baseFont - 10 : baseFont;
  const pad = Math.round(w * 0.1);
  const maxUnits = (w - pad * 2) / quoteSize;

  const { lines, size } = layout(quote.quote_text, { height: h, fontSize: quoteSize, maxUnits });
  const lineHeight = size * 1.32;
  const authorSize = Math.round(size * 0.5);
  const authorLine = author ? authorSize * 1.4 : 0;
  const blockHeight = lines.length * lineHeight + authorLine;
  const startY = Math.round((h - blockHeight) / 2 + size);

  // Judge the backdrop from its background rect, not from any color in
  // the SVG: the editorial template has a violet strip but a light
  // canvas, and white text on it would be invisible.
  const bgMatch = template.svg.match(/<rect[^>]*\bfill="(#[0-9a-f]{6})"/i);
  const bg = bgMatch ? bgMatch[1] : "#ffffff";
  const luminance = hex => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const dark = luminance(bg) < 0.5;
  const textFill = dark ? "#fffaf6" : "#24162d";
  const authorFill = dark ? "#ffd36a" : "#ff5574";

  const tspans = lines
    .map((l, i) => `<tspan x="${w / 2}" y="${Math.round(startY + i * lineHeight)}">${esc(l)}</tspan>`)
    .join("");

  const authorY = Math.round(startY + (lines.length - 1) * lineHeight + lineHeight + authorSize * 0.4);
  const authorMarkup = author
    ? `<text x="${w / 2}" y="${authorY}" text-anchor="middle" font-family="${font}" font-size="${authorSize}" fill="${authorFill}" font-style="italic">- ${esc(author)}</text>`
    : "";

  const brand = `<text x="${pad}" y="${h - pad * 0.7}" font-family="Georgia, serif" font-size="${Math.round(w * 0.028)}" fill="${textFill}" opacity="0.45">Couple in Bond</text>`;

  // Drop the template's own <svg> wrapper: we rebuild it with text layered on top.
  const backdrop = template.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");

  return sharp(Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    backdrop +
    `<text text-anchor="middle" font-family="${font}" font-size="${size}" fill="${textFill}">${tspans}</text>` +
    authorMarkup + brand + `</svg>`
  )).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
}

/* ---------- Run ---------- */

// Idempotency lives in a sidecar manifest, not in the JPEGs: a card is only
// rewritten when its row content or template changes.
const HASH_FILE = process.env.QUOTES_HASH
  ? path.resolve(process.env.QUOTES_HASH)
  : path.join(root, "data", ".quote-card-hashes.json");

const quotes = parseCsv(fs.readFileSync(CSV, "utf8"));
const hashes = fs.existsSync(HASH_FILE)
  ? JSON.parse(fs.readFileSync(HASH_FILE, "utf8"))
  : {};

if (!quotes.length) throw new Error(`No quotes found in ${path.relative(root, CSV)}`);

// Each mood maps to one template; an unknown mood falls back to the first template.
const pickTemplate = quote => templates.find(t => t.mood === quote.mood) || templates[0];

// Bump when renderCard's output changes, so every card re-renders.
const RENDER_VERSION = 2;

const cardHash = (quote, template) =>
  crypto.createHash("md5")
    .update([RENDER_VERSION, quote.quote_text, quote.author || "", quote.mood || "", template.name, template.svg].join("¬"))
    .digest("hex");

const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const seenIds = new Set();
const seenImages = new Set();
const cards = [];
const markup = [];
let rendered = 0;
let unchanged = 0;
let removed = 0;

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const [index, quote] of quotes.entries()) {
  const row = index + 2; // CSV line number; the header is line 1.
  if (!quote.id) { problems.push(`CSV line ${row}: missing id`); continue; }
  if (seenIds.has(quote.id)) { problems.push(`CSV line ${row}: duplicate id "${quote.id}"`); continue; }
  if (!quote.quote_text) { problems.push(`CSV line ${row}: empty quote_text for "${quote.id}"`); continue; }
  seenIds.add(quote.id);

  // The CSV's image column is the slug; fall back to the id so both stay in sync.
  const imageFile = `${quote.image || `quote-${quote.id}`}.jpg`;
  if (seenImages.has(imageFile)) { problems.push(`CSV line ${row}: duplicate image "${imageFile}"`); continue; }
  seenImages.add(imageFile);

  const template = pickTemplate(quote);
  const contentHash = cardHash(quote, template);
  const stale = hashes[imageFile] !== contentHash;

  if (checkOnly) {
    if (stale) problems.push(`Stale card, rerun the generator: ${imageFile}`);
  } else if (stale) {
    const buffer = await renderCard(quote, template);
    fs.writeFileSync(path.join(OUT_DIR, imageFile), buffer);
    hashes[imageFile] = contentHash;
    rendered += 1;
  } else {
    unchanged += 1;
  }

  const order = markup.length + 1;
  cards.push({ quote, template, imageFile, order });
  markup.push(cardMarkup(quote, order, template, imageFile));
}

// One pass per page: swap the card block and refresh the SEO item list so the
// structured data can never drift from the wall.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": "https://couplein.bond/quotes.html#collection",
      "url": "https://couplein.bond/quotes.html",
      "name": "Love Quote Photos for Couples",
      "description": "Browse a distinctive photo-led collection of love quotes, romantic messages, and thoughtful relationship reminders from Couple in Bond.",
      "inLanguage": "en"
    },
    {
      "@type": "ItemList",
      "@id": "https://couplein.bond/quotes.html#quote-cards",
      "name": "Couple in Bond love quote cards",
      "numberOfItems": cards.length,
      "itemListElement": cards.map(card => ({
        "@type": "ListItem",
        "position": card.order,
        "name": `Love quote card ${String(card.order).padStart(2, "0")}: ${card.quote.quote_text}`,
        "image": `https://couplein.bond/assets/quotes/${card.imageFile}`
      }))
    }
  ]
};

const ldScript = `<script type="application/ld+json" data-seo-enhancement>${JSON.stringify(jsonLd)}</script>`;

for (const pagePath of PAGES) {
  const html = fs.readFileSync(pagePath, "utf8");
  const rel = path.relative(root, pagePath);
  if (!html.includes(START) || !html.includes(END)) {
    problems.push(`${rel}: missing ${START} / ${END} markers`);
    continue;
  }
  const pageNl = html.includes("\r\n") ? "\r\n" : "\n";
  const cardBlock = `${START}${pageNl}${markup.map(m => `          ${m}`).join(pageNl)}${pageNl}          ${END}`;
  const updated = html
    .replace(new RegExp(`${escapeRegExp(START)}[\\s\\S]*?${escapeRegExp(END)}`), cardBlock)
    .replace(/<script type="application\/ld\+json" data-seo-enhancement>[\s\S]*?<\/script>/, ldScript);
  if (updated === html) continue;
  if (checkOnly) {
    problems.push(`${rel}: quote cards or SEO data is stale, rerun the generator`);
    continue;
  }
  fs.writeFileSync(pagePath, updated);
}

// Drop cards whose CSV rows are gone, so the wall and the folder stay in sync.
if (!checkOnly) {
  for (const file of fs.readdirSync(OUT_DIR)) {
    if (file.startsWith("quote-") && !seenImages.has(file)) {
      fs.unlinkSync(path.join(OUT_DIR, file));
      removed += 1;
    }
  }
  for (const key of Object.keys(hashes)) {
    if (!seenImages.has(key)) delete hashes[key];
  }
  fs.writeFileSync(HASH_FILE, JSON.stringify(hashes, null, 2) + "\n");
}

if (problems.length) {
  console.error(`✗ ${problems.length} problem${problems.length === 1 ? "" : "s"}:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

if (checkOnly) {
  console.log(`✓ Quote cards up to date (${unchanged} rendered cards, ${cards.length} CSV rows)`);
} else {
  console.log(`✓ Quote cards: ${rendered} rendered, ${unchanged} unchanged, ${removed} removed, ${cards.length} total`);
  if (PAGES.length) console.log(`  markup injected into ${PAGES.map(p => path.relative(root, p)).join(", ")}`);
}
