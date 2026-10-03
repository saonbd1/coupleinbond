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
- Current task: none - Bengali link hygiene is closed out
- Next task: review and improve the raw Bengali translation before adding any new content
- Blocker: none
- Notes: this class of bug is invisible to the existing checks - the links resolve, so `verify-links` passed the whole time. The new guard resolves each `<a href>` against the page directory and only then decides whether it lands in `/bn/`; it deliberately scans `<a>` tags only so `<link rel="alternate" hreflang>` keeps pointing at English, and it skips absolute URLs. Set `BENGALI_TWINS` in `scripts/verify-links.mjs` when a new page gains a Bengali translation.

## Carried into the translation pass

- The nav labels are still English on Bengali pages (Blog, Calculator, Polls, About Us, Privacy, Contact). Only the Valentine's Day label is localized so far. These are static strings in `blog-nav.js` and want localizing as part of the copy review.
- Six bridge article pages (`meaningful-questions`, `quiet-love`, `shared-rituals`, and the three `article-*` copies) previously pointed their `hreflang en` at `/blog.html`, which made one English page the alternate for seven different Bengali pages. They are now self-referential instead. Give each one a proper 1:1 English counterpart during the translation pass, then add the pair to `BENGALI_TRANSLATIONS` in `src/layouts/BlogPost.astro`.
- `BENGALI_TRANSLATIONS` in `src/layouts/BlogPost.astro` currently holds only `couple-bonding-activities-at-home`. Every new 1:1 article translation needs an entry there or the pair will not be reciprocal.
