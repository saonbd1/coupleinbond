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
  },
  bn: {
    source: path.join(rootDir, 'src/content/bn/articles.json'),
    output: path.join(rootDir, 'generated/bn'),
    baseUrl: 'https://couplein.bond/bn',
  },
};

const requiredChecks = [
  { name: 'title', regex: /<title>.*?<\/title>/is },
  { name: 'description', regex: /<meta[^>]+name=["']description["'][^>]*>/is },
  { name: 'canonical', regex: /<link[^>]+rel=["']canonical["'][^>]*>/is },
  { name: 'hreflang', regex: /<link[^>]+hreflang=/is },
  { name: 'og', regex: /<meta[^>]+property=["']og:/is },
  { name: 'h1', regex: /<h1\b/i },
];

// Page parity guard: every key English page must have a Bengali counterpart in bn/.
// Without this, an entire missing bn page (for example a Valentine's Day page)
// passes validation silently, because nothing compares the two page sets.
const requiredBengaliPages = [
  'index.html',
  'about.html',
  'blog.html',
  'calculator.html',
  'polls.html',
  'privacy.html',
  'valentines-day.html',
];

function checkBengaliPageParity(errors) {
  const bnDir = path.join(rootDir, 'bn');
  if (!fs.existsSync(bnDir)) {
    errors.push('Missing bn/ directory');
    return;
  }
  for (const page of requiredBengaliPages) {
    if (!fs.existsSync(path.join(bnDir, page))) {
      errors.push(`Missing Bengali page for EN parity: bn/${page}`);
    }
  }
}

const main = () => {
  const errors = [];

  for (const [localeKey, locale] of Object.entries(locales)) {
    if (!fs.existsSync(locale.source)) {
      errors.push(`Missing source file for ${localeKey}`);
      continue;
    }

    const source = JSON.parse(fs.readFileSync(locale.source, 'utf8'));
    const outputDir = locale.output;

    if (!fs.existsSync(outputDir)) {
      errors.push(`Missing output directory for ${localeKey}`);
      continue;
    }

    const blogFile = path.join(outputDir, 'blog.html');
    if (!fs.existsSync(blogFile)) {
      errors.push(`Missing blog landing page for ${localeKey}`);
    } else {
      const html = fs.readFileSync(blogFile, 'utf8');
      for (const check of requiredChecks) {
        if (!check.regex.test(html)) {
          errors.push(`Missing ${check.name} in ${localeKey}/blog.html`);
        }
      }
    }

    for (const article of source) {
      const fileName = `${article.slug}.html`;
      const filePath = path.join(outputDir, fileName);
      if (!fs.existsSync(filePath)) {
        errors.push(`Missing generated file: ${localeKey}/${fileName}`);
        continue;
      }

      const html = fs.readFileSync(filePath, 'utf8');
      for (const check of requiredChecks) {
        if (!check.regex.test(html)) {
          errors.push(`Missing ${check.name} in ${localeKey}/${fileName}`);
        }
      }

      if (!html.includes(`href="${locale.baseUrl}/${article.slug}.html"`)) {
        errors.push(`Canonical URL missing in ${localeKey}/${fileName}`);
      }
    }
  }

  checkBengaliPageParity(errors);

  if (errors.length > 0) {
    console.error('Localized content validation failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`Validated generated localized content for English and Bengali successfully.`);
};

main();
