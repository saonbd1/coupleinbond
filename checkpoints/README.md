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
- Milestone: Bengali Valentine's Day page + SEO hygiene
- Status: complete
- Last completed task: added `/bn/valentines-day.html` with a working countdown that renders Bengali numerals; made `valentines-countdown.js` locale-aware so one shared script serves both languages; added Valentine's Day to the shared nav (this also un-orphaned the existing English page); fixed `sitemap.xml` (removed two URLs that 404 in production, added the real keepsake page, added the full Bengali URL set); added an EN/BN page-parity guard to CI so a missing key Bengali page fails the build instead of passing silently; fixed the `/bn/social-share.js` 404 that broke social sharing on every Bengali page
- Current task: none - SEO hygiene is closed out and the structure is ready for the translation pass
- Next task: review and improve the raw Bengali translation before adding any new content
- Blocker: none
- Notes: `/bn/valentines-day.html` was a 404 before this session and is now live. All SEO gaps are closed: reciprocal `hreflang` across every EN/BN pair, `og:locale:alternate`, `og:image` plus `twitter:image` and JSON-LD on all Bengali pages, and `sitemap.xml` cleaned up and extended with the Bengali URL set. A new `verify:seo` CI step now fails the build if `hreflang` ever stops being reciprocal. Milestone 2 (translated content launch) is still partial: the core pages plus Valentine's are translated, but the Bengali copy is unedited bridge translation that has not been reviewed by a native speaker yet. Original Bengali editorial content (Milestone 3) should wait until the translation pass is done, so new work is not layered onto copy that still needs fixing.

## Carried into the translation pass

- Six bridge article pages (`meaningful-questions`, `quiet-love`, `shared-rituals`, and the three `article-*` copies) previously pointed their `hreflang en` at `/blog.html`, which made one English page the alternate for seven different Bengali pages. They are now self-referential instead. Give each one a proper 1:1 English counterpart during the translation pass, then add the pair to `BENGALI_TRANSLATIONS` in `src/layouts/BlogPost.astro`.
- `BENGALI_TRANSLATIONS` in `src/layouts/BlogPost.astro` currently holds only `couple-bonding-activities-at-home`. Every new 1:1 article translation needs an entry there or the pair will not be reciprocal.
