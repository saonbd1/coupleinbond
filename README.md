# Couple in Bond

Couple in Bond is a static relationship website with playful tools, conversation prompts, community polls, quotes, and optional blockchain keepsakes for shared moments.

## Documentation

The GitBook-ready documentation lives in [`docs/`](docs/README.md). Start with the [documentation home](docs/README.md) or use [`docs/SUMMARY.md`](docs/SUMMARY.md) as the navigation source.

## Site features

- Love Calculator for a lighthearted connection score
- Compatibility Quiz: a 15-question reflection across five areas (values, communication, conflict repair, time and affection, shared direction), with per-area result bars, a shareable text summary, and a private partner-compare mode — all browser-side
- Community polls with browser-local voting
- Love quotes and quote image keepsakes
- Relationship articles and practical bonding ideas
- Community Book notes stored in the visitor's browser
- Optional Love Result and Quote Image NFTs on Ink Chain

## Language

The site is **English-only**. A Bengali (`/bn/`) version was retired and fully
detached: all `/bn/` content, `hreflang` alternates, `og:locale:alternate` tags,
sitemap entries, language switchers, and the build/validate wiring were removed.
Any old `/bn/*` URL now issues a `301` to the English home via
[`vercel.json`](vercel.json), so existing backlinks keep their equity. No Bengali
content or code paths remain in the shipped site.

## Local preview

This is a static site. Serve the repository root with any local static-file server, then open `index.html` through that server. For example, with Python installed:

```text
python -m http.server 8000
```

Visit `http://localhost:8000/`.

## Deployment

The site is configured for Vercel through [`vercel.json`](vercel.json). Deploy the repository as a static site with no build command required.

## Automation: daily polls + articles

`scripts/daily_polls.py` generates relationship polls and companion blog
articles. It is scheduled to run daily via Windows Task Scheduler:

| | |
|---|---|
| Task name | `CoupleInBond - Daily Polls` |
| Schedule | Every day at 09:00 (local time) |
| Command | `scripts\run_daily_polls.cmd` |
| Log | `%LOCALAPPDATA%\coupleinbond\logs\daily_polls.log` |

The wrapper hardcodes the python path and prepends `node` and `git` to `PATH`,
so the scheduled environment does not depend on the interactive shell. Runs
continue to work on battery, and a run missed while the machine is off will
fire when it next starts (`StartWhenAvailable`).

```text
# run one batch now
scripts\run_daily_polls.cmd

# preview without writing anything
scripts\run_daily_polls.cmd --dry-run
```

Manage the schedule:

```text
schtasks /query /tn "CoupleInBond - Daily Polls" /v
schtasks /run  /tn "CoupleInBond - Daily Polls"
schtasks /delete /tn "CoupleInBond - Daily Polls" /f
```

## Blog images

Every article carries its own cover image (16:9) plus one in-body photo (3:2).
Both are stored in [`public/assets/blog/`](public/assets/blog) and wired in by
[`scripts/blog-images.mjs`](scripts/blog-images.mjs), which owns the whole
pipeline:

- **Source:** photos come from Wikimedia Commons' *Images from Unsplash*
  category — Unsplash photographs re-released as **CC0** (public-domain
  dedication), so commercial use is allowed and no attribution is legally
  required. Each image still ships a courtesy credit and a link to its Commons
  file page.
- **Processing:** `sharp` crops and compresses two derivatives per photo
  (`<key>-cover.jpg` at 1200×675, `<key>-body.jpg` at 1200×800).
- **Wiring:** the script writes `coverImage`, `coverImageAlt`,
  `coverImageCredit`, and `coverImageCreditUrl` into each post's frontmatter and
  inserts a single `<figure class="article-figure">` block between
  `<!-- cib:body-image:start -->` / `<!-- cib:body-image:end -->` markers.

The cover is rendered under the article header, used for the blog-card
thumbnails, and becomes the post's `og:image` / `twitter:image` /
`BlogPosting.image`.

```text
# fetch any missing images, then patch the markdown
npm run images:blog

# re-download and re-crop everything
node scripts/blog-images.mjs --force

# verify every post is illustrated (also runs in validate:release)
npm run images:check
```

Adding a new post: pick a cover and a body key from `CATALOG` in
`scripts/blog-images.mjs`, map the new slug in `POSTS`, and run
`npm run images:blog`. Cover keys must stay unique — the script fails if two
posts share one.


- Root HTML, CSS, and JavaScript files: public site pages and shared interactions
- `blog-posts/`: relationship articles
- `polls/`: individual poll pages
- `contracts/`: Solidity contracts for optional NFT features
- `assets/`: images and other static assets
- `docs/`: curated project documentation for GitBook
- `research/`: internal content, SEO, and verification notes; not part of the public GitBook by default
