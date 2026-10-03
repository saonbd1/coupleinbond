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

- Date: 2026-10-04
- Milestone: quote card image generator
- Status: complete
- Last completed task: built and shipped the quote card generator. `data/quotes.csv` is the source of truth (8 seed quotes; `id,quote_text,author,image,mood,date,bn_page,lang` columns - author may be blank and renders cleanly, never "Unknown"). Four templates in `quote-templates/` (midnight/bold, blush/soft, violet/poetic, editorial/real); each CSV mood maps to the template with the same mood. `scripts/generate-quote-cards.mjs` parses the CSV, wraps text per script (Bengali glyphs measured wider, auto-shrink until the block fits), renders SVG to JPEG q86 via sharp, and injects the cards into `public/quotes.html` between `QUOTE_CARDS:START/END` markers - the page also shows the quote text and author visibly under each image for SEO, with the real quote in the alt text. Idempotency uses a sidecar manifest (`data/.quote-card-hashes.json` keyed by image slug, invalidated by a RENDER_VERSION), so re-running with no changes writes nothing; `--check` fails if the cards or the page are stale. The generator also regenerates the page's JSON-LD ItemList from the CSV, so structured data cannot drift from the wall. Per-card Share buttons (`data-share-card`) share the full-size image URL plus quote text and author. The 16 watermarked `FB_IMG_*.jpg` reposts were deleted; the hero and lightbox now show generated cards, and the truncated `og:image` (`FB_IMG_17868806135`) now points at `quote-choose-again.jpg`. Bengali rendering was probed (vrinda conjuncts render; light templates now pick text color from the background rect's luminance - the editorial template's violet strip previously made white-on-white text).
- Current task: review and improve the raw Bengali translation before adding any new content
- Next task: read through the Bengali blog and poll translations line by line, fixing grammar and register
- Blocker: none
- Notes: the quote card generator is shipped and wired into validate:release (`npm run quotes:generate` runs before the build, `npm run quotes:check` fails on a stale committed page). The generated/ files show as modified in `git status` from line-ending normalization only - their content diff is empty.

## Priority queue

### DONE - Quote card image generator

- Goal: a script that generates quote card images and feeds the quotes page, so new quotes can be published on a daily cadence without hand-editing HTML or designing images one at a time.
- Publishing cadence: 5 new quotes per day on the quotes page (add rows to the CSV, one command regenerates).
- Inputs: `data/quotes.csv` (text + optional author) and `quote-templates/` (four designs).
- Output: rendered cards in `public/assets/quotes/`, injected into `public/quotes.html` via markers, plus regenerated JSON-LD.

## Carried into the translation pass

- The nav labels are still English on Bengali pages (Blog, Calculator, Polls, About Us, Privacy, Contact). Only the Valentine's Day label is localized so far. These are static strings in `blog-nav.js` and want localizing as part of the copy review.
- Six bridge article pages (`meaningful-questions`, `quiet-love`, `shared-rituals`, and the three `article-*` copies) previously pointed their `hreflang en` at `/blog.html`, which made one English page the alternate for seven different Bengali pages. They are now self-referential instead. Give each one a proper 1:1 English counterpart during the translation pass, then add the pair to `BENGALI_TRANSLATIONS` in `src/layouts/BlogPost.astro`.
- `BENGALI_TRANSLATIONS` in `src/layouts/BlogPost.astro` currently holds only `couple-bonding-activities-at-home`. Every new 1:1 article translation needs an entry there or the pair will not be reciprocal.
