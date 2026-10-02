import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const locales = {
  en: {
    source: path.join(rootDir, 'src/content/en/articles.json'),
    output: path.join(rootDir, 'generated/en'),
    baseUrl: 'https://couplein.bond',
    label: 'English',
    lang: 'en',
    siteName: 'Couple in Bond',
    nav: 'Home',
  },
  bn: {
    source: path.join(rootDir, 'src/content/bn/articles.json'),
    output: path.join(rootDir, 'generated/bn'),
    baseUrl: 'https://couplein.bond/bn',
    label: 'বাংলা',
    lang: 'bn',
    siteName: 'Couple in Bond বাংলা',
    nav: 'হোম',
  },
};

const ensureDir = (dirPath) => fs.mkdirSync(dirPath, { recursive: true });

const htmlEscape = (value = '') => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const articleTemplate = (article, locale) => `<!doctype html>
<html lang="${locale.lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${htmlEscape(article.title)} — ${htmlEscape(locale.siteName)}</title>
  <meta name="description" content="${htmlEscape(article.description)}">
  <meta name="theme-color" content="#ff4d6d">
  <link rel="canonical" href="${locale.baseUrl}/${article.slug}.html">
  <link rel="alternate" hreflang="en" href="https://couplein.bond/${article.slug}.html">
  <link rel="alternate" hreflang="bn" href="https://couplein.bond/bn/${article.slug}.html">
  <link rel="alternate" hreflang="x-default" href="https://couplein.bond/${article.slug}.html">
  <link rel="icon" href="../assets/coupleinbond-favicon.png">
  <meta property="og:title" content="${htmlEscape(article.title)} — ${htmlEscape(locale.siteName)}">
  <meta property="og:description" content="${htmlEscape(article.description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${locale.baseUrl}/${article.slug}.html">
  <meta property="og:locale" content="${locale.lang === 'bn' ? 'bn_BD' : 'en_US'}">
  <meta property="og:site_name" content="${htmlEscape(locale.siteName)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${htmlEscape(article.title)} — ${htmlEscape(locale.siteName)}">
  <meta name="twitter:description" content="${htmlEscape(article.description)}">
  <style>
    :root { --primary:#ff4d6d; --secondary:#6a00f4; --text:#1f2937; --muted:#566074; --card:rgba(255,255,255,0.95); --line:rgba(31,41,55,0.08); }
    * { box-sizing: border-box; }
    html, body { margin:0; font-family: Arial, "Noto Sans Bengali", sans-serif; background: linear-gradient(135deg, #ffd7df 0%, #f9d7ff 50%, #fbe6dd 100%); color: var(--text); }
    body { padding: 24px; }
    .container { max-width: 980px; margin: 0 auto; }
    .topbar { display:flex; justify-content:space-between; align-items:center; gap:16px; background: rgba(255,255,255,0.8); border:1px solid var(--line); border-radius:18px; padding:16px 20px; margin-bottom:24px; }
    .brand { font-size:1.3rem; font-weight:800; text-decoration:none; color:var(--text); }
    .nav { display:flex; gap:10px; flex-wrap:wrap; }
    .nav a { text-decoration:none; color:var(--text); font-weight:600; padding:8px 10px; border-radius:999px; }
    .nav a:hover { background: rgba(255,77,109,0.08); }
    .card { background: var(--card); border:1px solid var(--line); border-radius:22px; padding:32px 24px; }
    h1 { font-size: clamp(2rem, 4vw, 3rem); margin: 0 0 12px; }
    .kicker { display:inline-block; padding:6px 10px; border-radius:999px; background:rgba(255,77,109,0.12); color:var(--primary); font-weight:700; font-size:0.76rem; }
    .dek { color: var(--muted); font-size:1.1rem; line-height:1.8; margin: 18px 0 12px; }
    .meta { color: var(--muted); font-size: 0.9rem; margin-bottom: 18px; }
    h2 { margin-top: 28px; font-size: 1.45rem; }
    p, li { color: var(--muted); line-height: 1.9; font-size: 1.02rem; }
    ul { padding-left: 20px; }
    .callout { background: rgba(106,0,244,0.05); border-left: 4px solid var(--secondary); padding: 14px 16px; border-radius: 12px; margin: 18px 0; }
    @media (max-width:640px) { body { padding:14px; } .topbar { flex-direction:column; align-items:flex-start; } .card { padding:22px 18px; } }
  </style>
</head>
<body>
  <div class="container">
    <header class="topbar">
      <a class="brand" href="index.html">💕 Couple in Bond</a>
      <nav class="nav" aria-label="${locale.label} navigation">
        <a href="index.html">${locale.nav}</a>
        <a href="blog.html">Blog</a>
        <a href="../about.html">About</a>
      </nav>
    </header>

    <main class="card">
      <div class="kicker">${htmlEscape(article.kicker)}</div>
      <h1>${htmlEscape(article.title)}</h1>
      <p class="dek">${htmlEscape(article.excerpt)}</p>
      <div class="meta">Published: ${htmlEscape(article.published)} · Couple in Bond Editorial</div>
      ${article.sections.map((section) => `
        <h2>${htmlEscape(section.heading)}</h2>
        <p>${htmlEscape(section.body)}</p>
      `).join('')}
    </main>
  </div>
</body>
</html>
`;

const blogTemplate = (articles, locale) => `<!doctype html>
<html lang="${locale.lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${locale.lang === 'bn' ? 'বাংলা ব্লগ' : 'Blog'} — ${htmlEscape(locale.siteName)}</title>
  <meta name="description" content="${locale.lang === 'bn' ? 'Couple in Bond বাংলা ব্লগ: রিলেশনশিপ কনটেন্ট, প্র্যাকটিক্যাল টিপস, এবং ছোট ছোট অনুপ্রেরণামূলক পোস্ট।' : 'Relationship ideas and thoughtful prompts for deeper connection.'}">
  <meta name="theme-color" content="#ff4d6d">
  <link rel="canonical" href="${locale.baseUrl}/blog.html">
  <link rel="alternate" hreflang="en" href="https://couplein.bond/blog.html">
  <link rel="alternate" hreflang="bn" href="https://couplein.bond/bn/blog.html">
  <link rel="alternate" hreflang="x-default" href="https://couplein.bond/">
  <meta property="og:title" content="${locale.lang === 'bn' ? 'বাংলা ব্লগ' : 'Blog'} — ${htmlEscape(locale.siteName)}">
  <meta property="og:description" content="${locale.lang === 'bn' ? 'রিলেশনশিপ, বন্ধন, এবং ছোট ছোট অনুপ্রেরণামূলক লেখার বাংলা ব্লগ।' : 'Thoughtful ideas to strengthen connection, communication, and care.'}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${locale.baseUrl}/blog.html">
  <meta property="og:locale" content="${locale.lang === 'bn' ? 'bn_BD' : 'en_US'}">
  <meta property="og:site_name" content="${htmlEscape(locale.siteName)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${locale.lang === 'bn' ? 'বাংলা ব্লগ' : 'Blog'} — ${htmlEscape(locale.siteName)}">
  <meta name="twitter:description" content="${locale.lang === 'bn' ? 'রিলেশনশিপ, বন্ধন, আর অনুপ্রেরণামূলক বাংলার কিছু সুন্দর লেখা।' : 'Relationship insights, rituals, and prompts for more intentional connection.'}">
  <style>
    :root { --primary:#ff4d6d; --text:#1f2937; --muted:#566074; --card:rgba(255,255,255,0.92); --line:rgba(31,41,55,0.08); }
    * { box-sizing: border-box; }
    html, body { margin:0; font-family: Arial, "Noto Sans Bengali", sans-serif; background: linear-gradient(135deg, #ffd7df 0%, #f9d7ff 50%, #fbe6dd 100%); color: var(--text); }
    body { padding: 24px; }
    .container { max-width: 1100px; margin: 0 auto; }
    .topbar { display:flex; justify-content:space-between; align-items:center; gap:16px; background: rgba(255,255,255,0.75); border:1px solid var(--line); border-radius:18px; padding:16px 20px; margin-bottom:24px; }
    .brand { text-decoration:none; color:var(--text); font-weight:800; font-size:1.3rem; }
    .nav { display:flex; gap:10px; flex-wrap:wrap; }
    .nav a { text-decoration:none; color:var(--text); font-weight:600; padding:8px 10px; border-radius:999px; }
    .nav a:hover { background: rgba(255,77,109,0.09); }
    .nav .active { background: rgba(255,77,109,0.12); }
    .card { background: var(--card); border:1px solid var(--line); border-radius:24px; padding:28px; }
    h1 { margin-top:0; font-size: clamp(2rem, 4vw, 2.7rem); }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:18px; margin-top:18px; }
    .post { background:#fff; border:1px solid var(--line); border-radius:18px; padding:18px; }
    .tag { display:inline-block; padding:6px 10px; border-radius:999px; background: rgba(255,77,109,0.12); color:var(--primary); font-size:0.8rem; font-weight:700; }
    h2 { font-size:1.1rem; margin:14px 0 8px; }
    p { color: var(--muted); line-height:1.7; }
    a { color: var(--primary); text-decoration:none; }
    a:hover { text-decoration:underline; }
    @media (max-width:640px) { body { padding:14px; } .topbar { flex-direction:column; align-items:flex-start; } .card { padding:22px 18px; } }
  </style>
</head>
<body>
  <div class="container">
    <header class="topbar">
      <a class="brand" href="index.html">💕 Couple in Bond</a>
      <nav class="nav" aria-label="${locale.label} navigation">
        <a href="index.html">${locale.lang === 'bn' ? 'হোম' : 'Home'}</a>
        <a href="blog.html" class="active">${locale.lang === 'bn' ? 'ব্লগ' : 'Blog'}</a>
        <a href="about.html">${locale.lang === 'bn' ? 'আমাদের সম্পর্কে' : 'About'}</a>
      </nav>
    </header>

    <main class="card">
      <h1>${locale.lang === 'bn' ? 'বাংলা ব্লগ' : 'Blog'}</h1>
      <p>${locale.lang === 'bn' ? 'এই পোর্টালটি এখনো লঞ্চের জন্য সহজ, পরিষ্কার, আর কিছুটা অনুবাদ-ভিত্তিকভাবে সাজানো হয়েছে।' : 'This content stream is built for a repeatable, scalable publishing flow.'}</p>

      <div class="grid">
        ${articles.map((article) => `
          <article class="post">
            <span class="tag">${htmlEscape(article.category)}</span>
            <h2><a href="${article.slug}.html">${htmlEscape(article.title)}</a></h2>
            <p>${htmlEscape(article.excerpt)}</p>
          </article>
        `).join('')}
      </div>
    </main>
  </div>
</body>
</html>
`;

const main = () => {
  for (const localeKey of Object.keys(locales)) {
    const locale = locales[localeKey];
    ensureDir(locale.output);

    if (!fs.existsSync(locale.source)) {
      throw new Error(`Missing source for ${localeKey}: ${locale.source}`);
    }

    const articles = JSON.parse(fs.readFileSync(locale.source, 'utf8'));

    for (const article of articles) {
      const filePath = path.join(locale.output, `${article.slug}.html`);
      fs.writeFileSync(filePath, articleTemplate(article, locale), 'utf8');
      console.log(`Generated ${filePath}`);
    }

    const blogPath = path.join(locale.output, 'blog.html');
    fs.writeFileSync(blogPath, blogTemplate(articles, locale), 'utf8');
    console.log(`Generated ${blogPath}`);
  }

  console.log(`Generated localized content for all supported languages.`);
};

main();
