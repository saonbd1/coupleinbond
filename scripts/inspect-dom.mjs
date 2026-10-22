// Temporary inspection helper for the preview server.
// Usage:
//   node scripts/inspect-dom.mjs <dom-file>            -> polls pagination summary
//   node scripts/inspect-dom.mjs <dom-file> overflow   -> print the probe output
import fs from 'node:fs';

const file = process.argv[2];
const mode = process.argv[3];
const html = fs.readFileSync(file, 'utf8');

function decode(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

if (mode === 'overflow') {
  const m = html.match(/<pre id="out">([\s\S]*?)<\/pre>/);
  console.log(m ? decode(m[1]) : 'no probe output found');
  process.exit(0);
}

const pag = html.match(/<div class="polls-pagination">[\s\S]*?<\/div>\s*<\/div>/);
console.log('--- pagination markup ---');
console.log(pag ? pag[0].replace(/></g, '>\n<') : 'not found');

console.log('\n--- counts ---');
console.log('poll cards:', (html.match(/class="poll-card"/g) || []).length);
const current = html.match(/aria-label="(\d+) polls per page, current"/);
console.log('active size:', current ? current[1] : 'none');
