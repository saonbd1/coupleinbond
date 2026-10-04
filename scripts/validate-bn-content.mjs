import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sourceFile = path.join(rootDir, 'src/content/bn/articles.json');
const targetDir = path.join(rootDir, 'bn');

const requiredChecks = [
  { name: 'title', regex: /<title>.*?<\/title>/is },
  { name: 'description', regex: /<meta[^>]+name=["']description["'][^>]*>/is },
  { name: 'canonical', regex: /<link[^>]+rel=["']canonical["'][^>]*>/is },
  { name: 'hreflang', regex: /<link[^>]+hreflang=/is },
  { name: 'og', regex: /<meta[^>]+property=["']og:/is },
  { name: 'h1', regex: /<h1\b/i },
];

const validateHtml = (slug, html) => {
  const errors = [];

  for (const check of requiredChecks) {
    if (!check.regex.test(html)) {
      errors.push(`Missing ${check.name} in ${slug}.html`);
    }
  }

  if (!html.includes(`href="https://couplein.bond/bn/${slug}.html"`)) {
    errors.push(`Canonical URL missing for ${slug}.html`);
  }

  return errors;
};

const main = () => {
  if (!fs.existsSync(sourceFile)) {
    throw new Error(`Missing source file: ${sourceFile}`);
  }

  const articles = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
  const errors = [];

  const blogFile = path.join(targetDir, 'blog.html');
  if (!fs.existsSync(blogFile)) {
    errors.push('Missing generated Bengali blog landing page.');
  } else {
    const blogHtml = fs.readFileSync(blogFile, 'utf8');
    errors.push(...validateHtml('blog', blogHtml));
  }

  for (const article of articles) {
    const slug = String(article.slug || '').trim();
    const filePath = path.join(targetDir, `${slug}.html`);

    if (!fs.existsSync(filePath)) {
      errors.push(`Missing generated file for slug: ${slug}`);
      continue;
    }

    const html = fs.readFileSync(filePath, 'utf8');
    errors.push(...validateHtml(slug, html));
  }

  // Footer coverage: every built Bengali page must render the shared footer.
  // Each page needs a footer placeholder (.site-footer or .blog-footer) plus a
  // footer injector — the shared social-icons.js script, loaded directly or via
  // blog-nav.js (which injects social-icons.js on the homepage and valentines-day).
  const bnFiles = fs.readdirSync(targetDir).filter((file) => file.endsWith('.html'));
  for (const file of bnFiles) {
    const html = fs.readFileSync(path.join(targetDir, file), 'utf8');
    if (!/class="(?:site-footer|blog-footer)"/.test(html)) {
      errors.push(`Missing footer placeholder in ${file}`);
    }
    if (!/social-icons\.js|blog-nav\.js/.test(html)) {
      errors.push(`Missing footer injector (social-icons.js or blog-nav.js) in ${file}`);
    }
  }

  if (errors.length > 0) {
    console.error('Validation failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`Validated ${articles.length} Bengali article files and the Bengali blog landing page successfully.`);
};

main();
