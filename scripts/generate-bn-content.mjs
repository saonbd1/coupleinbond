import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sourceFile = path.join(rootDir, 'src/content/bn/articles.json');
const targetDir = path.join(rootDir, 'bn');

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const articleTemplate = (article) => `<!doctype html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${article.title} — Couple in Bond বাংলা</title>
  <meta name="description" content="${article.description}">
  <meta name="theme-color" content="#ff4d6d">
  <link rel="canonical" href="https://couplein.bond/bn/${article.slug}.html">
  <link rel="alternate" hreflang="bn" href="https://couplein.bond/bn/${article.slug}.html">
  <link rel="alternate" hreflang="x-default" href="https://couplein.bond/bn/${article.slug}.html">
  <link rel="icon" href="../assets/coupleinbond-favicon.png">
  <meta property="og:title" content="${article.title} — Couple in Bond বাংলা">
  <meta property="og:description" content="${article.description}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://couplein.bond/bn/${article.slug}.html">
  <meta property="og:locale" content="bn_BD">
  <meta property="og:site_name" content="Couple in Bond">
  <meta property="og:image" content="https://couplein.bond/assets/social-share.jpg">
  <meta property="og:image:alt" content="Couple in Bond সম্পর্কের টুলস আর জোড়া বন্ধনের আইডিয়া">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${article.title} — Couple in Bond বাংলা">
  <meta name="twitter:description" content="${article.description}">
  <meta name="twitter:image" content="https://couplein.bond/assets/social-share.jpg">
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
      <nav class="nav" aria-label="বাংলা নেভিগেশন">
        <a href="index.html">হোম</a>
        <a href="blog.html">ব্লগ</a>
        <a href="about.html">আমাদের সম্পর্কে</a>
        <a href="privacy.html">গোপনীয়তা</a>
      </nav>
    </header>

    <main class="card">
      <div class="kicker">${article.kicker}</div>
      <h1>${article.title}</h1>
      <p class="dek">${article.excerpt}</p>
      <div class="meta">প্রকাশিত: ${article.published} · Couple in Bond Editorial</div>
      ${article.sections.map((section) => `
        <h2>${section.heading}</h2>
        <p>${section.body}</p>
      `).join('')}
    </main>
    <footer class="site-footer"></footer>
  </div>
  <script src="../social-icons.js" defer></script>
</body>
</html>
`;

const blogTemplate = (articles) => `<!doctype html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ব্লগ — Couple in Bond বাংলা</title>
  <meta name="description" content="Couple in Bond বাংলা ব্লগ: রিলেশনশিপ কনটেন্ট, প্র্যাকটিক্যাল টিপস, এবং ছোট ছোট অনুপ্রেরণামূলক পোস্ট।">
  <meta name="theme-color" content="#ff4d6d">
  <link rel="canonical" href="https://couplein.bond/bn/blog.html">
  <link rel="alternate" hreflang="en" href="https://couplein.bond/blog.html">
  <link rel="alternate" hreflang="bn" href="https://couplein.bond/bn/blog.html">
  <link rel="alternate" hreflang="x-default" href="https://couplein.bond/blog.html">
  <link rel="icon" href="../assets/coupleinbond-favicon.png">
  <meta property="og:title" content="বাংলা ব্লগ — Couple in Bond">
  <meta property="og:description" content="রিলেশনশিপ, বন্ধন, এবং ছোট ছোট অনুপ্রেরণামূলক লেখার বাংলা ব্লগ।">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://couplein.bond/bn/blog.html">
  <meta property="og:locale" content="bn_BD">
  <meta property="og:site_name" content="Couple in Bond">
  <meta property="og:image" content="https://couplein.bond/assets/social-share.jpg">
  <meta property="og:image:alt" content="Couple in Bond সম্পর্কের টুলস আর জোড়া বন্ধনের আইডিয়া">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="বাংলা ব্লগ — Couple in Bond">
  <meta name="twitter:description" content="রিলেশনশিপ, বন্ধন, এবং ছোট ছোট অনুপ্রেরণামূলক লেখার বাংলা ব্লগ।">
  <meta name="twitter:image" content="https://couplein.bond/assets/social-share.jpg">
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
      <nav class="nav" aria-label="বাংলা নেভিগেশন">
        <a href="index.html">হোম</a>
        <a href="blog.html" class="active">ব্লগ</a>
        <a href="about.html">আমাদের সম্পর্কে</a>
        <a href="privacy.html">গোপনীয়তা</a>
        <a href="../blog.html" lang="en">English blog</a>
      </nav>
    </header>

    <main class="card">
      <h1>বাংলা ব্লগ</h1>
      <p>এই পোর্টালটি এখনো লঞ্চের জন্য সহজ, পরিষ্কার, আর কিছুটা অনুবাদ-ভিত্তিকভাবে সাজানো হয়েছে। সময়ের সঙ্গে এখানে আরো স্বচ্ছ ভাষা, স্থানীয় কণ্ঠস্বর, এবং মূলত বাংলা-ভিত্তিক গল্প ও টিপস যোগ হবে।</p>

      <div class="grid">
        ${articles.map((article) => `
          <article class="post">
            <span class="tag">${article.category}</span>
            <h2><a href="${article.slug}.html">${article.title}</a></h2>
            <p>${article.excerpt}</p>
          </article>
        `).join('')}
      </div>
    </main>
    <footer class="site-footer"></footer>
  </div>
  <script src="../social-icons.js" defer></script>
</body>
</html>
`;

const main = () => {
  ensureDir(targetDir);

  if (!fs.existsSync(sourceFile)) {
    throw new Error(`Source file not found: ${sourceFile}`);
  }

  const articles = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));

  for (const article of articles) {
    const safeSlug = String(article.slug || '').trim();
    if (!safeSlug) {
      throw new Error('Every article must include a slug.');
    }

    const filePath = path.join(targetDir, `${safeSlug}.html`);
    fs.writeFileSync(filePath, articleTemplate(article), 'utf8');
    console.log(`Generated ${filePath}`);
  }

  const blogPath = path.join(targetDir, 'blog.html');
  fs.writeFileSync(blogPath, blogTemplate(articles), 'utf8');
  console.log(`Generated ${blogPath}`);

  console.log(`Generated ${articles.length} Bengali article files and blog landing page.`);
};

main();
