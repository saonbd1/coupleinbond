// Verifies the client-side pagination on the polls listing
// (public/polls.js): page size switching, page navigation, and the
// topic filter resetting to page 1.
//
// Run after `npm run build`:
//   node scripts/verify-polls-pagination.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dist = path.join(rootDir, 'dist');

if (!fs.existsSync(dist)) {
  console.error(`No build output at ${dist}. Run "npm run build" first.`);
  process.exit(1);
}

const problems = [];

function loadPage(search = '') {
  const html = fs.readFileSync(path.join(dist, 'polls.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: `https://couplein.bond/polls.html${search}`,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  // The listing script expects these globals.
  window.URLSearchParams = URLSearchParams;
  window.scrollTo = () => {};

  const pollData = fs.readFileSync(path.join(rootDir, 'public', 'poll-data.js'), 'utf8');
  window.eval(pollData);
  window.eval(fs.readFileSync(path.join(rootDir, 'public', 'polls.js'), 'utf8'));

  // polls.js runs immediately, so trigger the DOMContentLoaded-free path:
  // it is an IIFE, not a listener, so it already ran. Nothing else to do.
  return window;
}

function cards(window) {
  return window.document.querySelectorAll('#pollsList .poll-card');
}

function pageNumbers(window) {
  return Array.from(window.document.querySelectorAll('#pollsPagination .pagination-number'))
    .map((node) => node.textContent);
}

function currentPage(window) {
  const node = window.document.querySelector('#pollsPagination .pagination-number.is-current');
  return node ? node.textContent : null;
}

// --- default page size (6) ---
{
  const window = loadPage();
  const count = cards(window).length;
  if (count !== 6) problems.push(`default page shows ${count} poll cards, expected 6`);
  if (currentPage(window) !== '1') problems.push(`default page current marker is "${currentPage(window)}", expected "1"`);
}

// --- page size 8 ---
{
  const window = loadPage('?size=8');
  const count = cards(window).length;
  if (count !== 8) problems.push(`size=8 shows ${count} poll cards, expected 8`);
}

// --- page size 10 ---
{
  const window = loadPage('?size=10');
  const count = cards(window).length;
  if (count !== 10) problems.push(`size=10 shows ${count} poll cards, expected 10`);
}

// --- navigating to page 2 changes the cards shown ---
{
  const window = loadPage();
  const firstIds = Array.from(cards(window)).map((c) => c.querySelector('.poll-card-title-link').textContent);
  const next = window.document.querySelector('#pollsPagination .pagination-step[rel="next"]');
  if (!next) {
    problems.push('no "Next" pagination link found on page 1');
  } else {
    next.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    const secondIds = Array.from(cards(window)).map((c) => c.querySelector('.poll-card-title-link').textContent);
    if (currentPage(window) !== '2') problems.push(`after Next, current page is "${currentPage(window)}", expected "2"`);
    if (JSON.stringify(firstIds) === JSON.stringify(secondIds)) {
      problems.push('page 2 shows the same polls as page 1');
    }
  }
}

// --- topic filter resets to page 1 ---
{
  const window = loadPage('?size=6');
  const next = window.document.querySelector('#pollsPagination .pagination-step[rel="next"]');
  next.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  if (currentPage(window) !== '2') problems.push('setup: expected to be on page 2');
  const filter = window.document.querySelector('.topic-filter button[data-topic="connection"]');
  filter.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  if (currentPage(window) !== '1') {
    problems.push(`after topic filter, current page is "${currentPage(window)}", expected "1"`);
  }
}

// --- the size selector marks the active size ---
{
  const window = loadPage('?size=8');
  const current = window.document.querySelector('.page-size-option.is-current');
  if (!current || current.dataset.pageSize !== '8') {
    problems.push('size=8 does not mark the "8" option as current');
  }
}

if (problems.length) {
  console.log(`PROBLEMS (${problems.length}):`);
  problems.forEach((p) => console.log(' - ' + p));
  process.exit(1);
}
console.log('polls pagination: OK - no problems found.');
