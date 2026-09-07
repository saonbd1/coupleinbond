# Couple in Bond

Couple in Bond is a static relationship website with playful tools, conversation prompts, community polls, quotes, and optional blockchain keepsakes for shared moments.

## Documentation

The GitBook-ready documentation lives in [`docs/`](docs/README.md). Start with the [documentation home](docs/README.md) or use [`docs/SUMMARY.md`](docs/SUMMARY.md) as the navigation source.

## Site features

- Love Calculator for a lighthearted connection score
- Community polls with browser-local voting
- Love quotes and quote image keepsakes
- Relationship articles and practical bonding ideas
- Community Book notes stored in the visitor's browser
- Optional Love Result and Quote Image NFTs on Ink Chain

## Local preview

This is a static site. Serve the repository root with any local static-file server, then open `index.html` through that server. For example, with Python installed:

```text
python -m http.server 8000
```

Visit `http://localhost:8000/`.

## Deployment

The site is configured for Vercel through [`vercel.json`](vercel.json). Deploy the repository as a static site with no build command required.

## Repository layout

- Root HTML, CSS, and JavaScript files: public site pages and shared interactions
- `blog-posts/`: relationship articles
- `polls/`: individual poll pages
- `contracts/`: Solidity contracts for optional NFT features
- `assets/`: images and other static assets
- `docs/`: curated project documentation for GitBook
- `research/`: internal content, SEO, and verification notes; not part of the public GitBook by default
