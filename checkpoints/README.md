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
- Current task: close the remaining SEO gaps — the English pages still declare no `hreflang`, so the relationship is one-directional
- Next task: review and improve the raw Bengali translation before adding any new content
- Blocker: none
- Notes: `/bn/valentines-day.html` was a 404 before this session and is now live. Milestone 2 (translated content launch) is still partial: the core pages plus Valentine's are translated, but the Bengali copy is unedited bridge translation that has not been reviewed by a native speaker yet. Original Bengali editorial content (Milestone 3) should wait until the translation pass is done, so new work is not layered onto copy that still needs fixing.
