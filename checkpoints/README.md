# Work checkpoints

Use this folder as the lightweight checkpoint log for the Bengali launch work.

## Session template

- Date:
- Milestone:
- Status: not started / in progress / complete
- Last completed task:
- Current task:
- Next task:
- Blocker:
- Notes:

## Example

- Date: 2026-10-02
- Milestone: bilingual foundation
- Status: in progress
- Last completed task: roadmap created
- Current task: create /bn/ structure and language switcher
- Next task: translate landing page
- Blocker: none
- Notes: keep translated pages as temporary launch bridge

## Rule

Before leaving the project, update the checkpoint note and keep one active task only.

## Current checkpoint

- Date: 2026-10-03
- Milestone: Bengali cross-linking correctness
- Status: complete
- Last completed task: fixed every Bengali link that silently sent readers back to the English site. Sixteen `<a href>` values across eight `bn/*.html` files pointed at `../index.html`, `../calculator.html`, `../blog.html`, `../polls.html`, `../about.html`, `../privacy.html`, `../valentines-day.html` and `../blog-posts/couple-bonding-activities-at-home.html` even though a Bengali twin existed for each; they now resolve to their Bengali siblings. `blog-nav.js` had the same defect in the JS-injected nav: it built every item from `data-root`, so the nav on every Bengali page linked to English. It now resolves nav links against the page language, and the language switch is page-aware (a Bengali article links to its English counterpart, not just the English homepage). Contact stays English because it has no Bengali translation. Added a CI guard that fails the build when a Bengali page links to an English page that has a Bengali twin.
- Current task: build the quote card image generator (see Priority queue below)
- Next task: review and improve the raw Bengali translation before adding any new content
- Blocker: none
- Notes: this class of bug is invisible to the existing checks - the links resolve, so `verify-links` passed the whole time. The new guard resolves each `<a href>` against the page directory and only then decides whether it lands in `/bn/`; it deliberately scans `<a>` tags only so `<link rel="alternate" hreflang>` keeps pointing at English, and it skips absolute URLs. Set `BENGALI_TWINS` in `scripts/verify-links.mjs` when a new page gains a Bengali translation.

## Priority queue

### HIGH - Quote card image generator

- Goal: a script that generates quote card images and feeds the quotes page, so new quotes can be published on a daily cadence without hand-editing HTML or designing images one at a time.
- Publishing cadence: 5 new quotes per day on the quotes page.
- Inputs:
  - A CSV file holding the quote text and an author name where one is available (author is optional and may be blank - the card must render correctly without it, never as "Unknown" or an empty quote mark).
  - A folder of multiple card image templates; the generator picks a design from this folder when rendering.
- Output: rendered card images written into `public/assets/quotes/`, referenced by the quotes page.

Current state, so the task is not started from a blank page:

- `public/quotes.html` holds the quote wall as hardcoded markup: one `<article class="quote-card" data-quote-card data-mood="...">` per quote, each linking to an image under `assets/quotes/`. There is no data file driving it.
- `public/assets/quotes/` already holds 16 card images named `FB_IMG_<timestamp>.jpg`. These are the seed content; treat them as existing art, do not overwrite or regenerate them.
- No CSV exists anywhere in the repo yet, and no quote object carries an author field - so there is no existing author data to migrate.

Decisions still to make before coding (these are the real unknowns, settle them first):

- Rendering approach. `sharp` can composite text onto a template but has weak text layout, especially for Bengali. `canvas` / `node-canvas` or `satori` + `resvg` handle wrapping and shaping better. Bengali conjuncts need a font with proper shaping, so whichever route is chosen must be proven against Bengali text, not just English.
- How the generator relates to the page. Generating images alone still leaves `quotes.html` needing a matching hand edit per quote. Consider whether the quote wall should be driven from the same CSV at build time so the two cannot drift apart.
- Naming and idempotency. The generator must be safe to re-run: a quote already rendered should not be silently re-rendered or duplicated. Content-hash or slug-based filenames are safer than the current timestamps.
- Template selection. Decide whether "pick any design" means random, round-robin, or by a column in the CSV. Round-robin is the most predictable to eyeball.
- Scheduling. 5 per day implies a daily run. Decide between a scheduled CI job and a local cron/Task Scheduler step, and make the script safe to run when there is nothing new to do.

Acceptance for "done":

- Add a row to the CSV, run one command, and the new card image appears on the quotes page.
- A quote with a blank author renders cleanly.
- Re-running with no CSV changes produces no new files and no duplicate page entries.
- Bengali quote text renders with correct conjuncts, not broken or tofu glyphs.
- Existing `FB_IMG_*.jpg` cards still render and are untouched.

## Carried into the translation pass

- The nav labels are still English on Bengali pages (Blog, Calculator, Polls, About Us, Privacy, Contact). Only the Valentine's Day label is localized so far. These are static strings in `blog-nav.js` and want localizing as part of the copy review.
- Six bridge article pages (`meaningful-questions`, `quiet-love`, `shared-rituals`, and the three `article-*` copies) previously pointed their `hreflang en` at `/blog.html`, which made one English page the alternate for seven different Bengali pages. They are now self-referential instead. Give each one a proper 1:1 English counterpart during the translation pass, then add the pair to `BENGALI_TRANSLATIONS` in `src/layouts/BlogPost.astro`.
- `BENGALI_TRANSLATIONS` in `src/layouts/BlogPost.astro` currently holds only `couple-bonding-activities-at-home`. Every new 1:1 article translation needs an entry there or the pair will not be reciprocal.
