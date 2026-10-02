// @ts-check
import { defineConfig } from 'astro/config';

// Couple in Bond — Astro config.
//
// IMPORTANT: `build.format: 'file'` keeps the existing URL shape
// (`/about.html`, `/polls/foo.html`) instead of Astro's default
// directory style (`/about/`). Every existing link, canonical tag,
// sitemap entry, and Google-indexed URL depends on the `.html` form,
// so this must stay 'file'.
export default defineConfig({
  site: 'https://couplein.bond',
  build: {
    format: 'file',
  },
  // Content pages must stay zero-JS for the SEO/AEO goals; only the
  // interactive tools (calculator, quiz, wallet) load scripts, and those
  // are still plain <script> tags served from public/ during migration.
  compressHTML: true,
});