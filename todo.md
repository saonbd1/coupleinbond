# CoupleIn Bond schedule setup

- [x] Check the current schedule state and deployment prerequisite.
- [ ] Create or update the daily 14:37 GMT+6 compatibility-article schedule — blocked because no managed WebDev project is deployed.
- [x] Verify the schedule status and report any deployment limitation.

## High priority: Bengali footer coverage

- [x] Add a consistent Bengali-localized shared footer to the 12 built Bengali pages currently missing one: `about.html`, `article-bonding-at-home.html`, `article-meaningful-questions.html`, `article-quiet-love.html`, `article-shared-rituals.html`, `blog.html`, `calculator.html`, `meaningful-questions.html`, `polls.html`, `privacy.html`, `quiet-love.html`, and `shared-rituals.html` under `/bn/`.
- [x] Update `scripts/generate-bn-content.mjs` so generated Bengali blog and article pages include the footer placeholder and load the shared footer injector.
- [x] Add the footer placeholder and injector to the remaining hand-maintained Bengali pages; keep Bengali footer labels and destinations localized where translations exist.
- [x] Verify every built Bengali page renders one footer, links resolve to Bengali siblings when available, and missing footer coverage fails `npm run validate:release`.

## Publish five compatibility articles and compress images

- [x] Audit article drafts, blog structure, image assets, and SEO inventories.
- [x] Convert the five drafts into site-compatible blog pages with unique metadata.
- [x] Add the articles to blog navigation, sitemap, validators, and internal links.
- [x] Compress repository image assets and verify references and output quality.
- [x] Run content, SEO, link, syntax, and asset checks.
- [x] Report the prepared publishable changes and separate GitHub push from hosting deployment.

## Homepage editorial redesign

- [x] Audit the current homepage against the blog page’s structure, styles, assets, and responsive behavior.
- [x] Define the homepage information architecture and editorial design direction based on the blog page.
- [x] Implement the homepage redesign while preserving the existing brand, tools, wallet connector, community features, and Web3 keepsake flow.
- [x] Run visual, content, link, and SEO validation across the redesigned homepage and affected shared components.
- [x] Present the homepage preview and change summary for user approval before any commit or push.

## Homepage latest-post hero image

- [ ] Identify the latest blog post, its hero asset, and the current homepage feature-note markup.
- [ ] Add the latest post hero image with accessible responsive styling to the homepage feature note.
- [ ] Preview and validate the updated homepage image, links, SEO, and whitespace.
- [ ] Present the updated preview and wait for approval before committing or pushing.

## Homepage latest-post social share

- [ ] Audit the latest-post feature-note markup and existing social icon styling.
- [ ] Add Facebook, Instagram, X, and TikTok share icons beneath the latest post.
- [ ] Preview and validate the social-share row, links, accessibility, and whitespace.
- [ ] Present the updated preview and wait for approval before committing or pushing.

## Site-wide social sharing correction

- [ ] Audit shared page shells, content pages, existing social icons, and the homepage share row.
- [ ] Define the shared social-share component and page eligibility rules.
- [ ] Remove the homepage-card share row and add sharing to blog posts, quotes, and eligible content pages.
- [ ] Validate page coverage, share URLs, accessibility, responsive styling, SEO, and internal links.
- [ ] Present the site-wide sharing preview and wait for approval before committing or pushing.

## Footer Blog link

- [x] Audit the shared footer renderer and current left-side footer links.
- [x] Add the Blog link to the left footer navigation and preserve responsive alignment.
- [x] Preview and validate footer coverage, links, accessibility, and whitespace.
- [x] Present the footer preview and wait for approval before committing or pushing.

## Love Calculator card button

- [ ] Audit the Love Calculator card markup and current CTA styles.
- [ ] Replace the text CTA with a themed Love Calculator button.
- [ ] Preview and validate the button destination, accessibility, layout, and whitespace.
- [ ] Present the updated card preview and wait for approval before committing or pushing.

## Footer navigation label rename

- [x] Audit the shared footer renderer and current left-side navigation labels.
- [x] Rename the four left footer links without changing their destinations or layout.
- [x] Preview and validate footer labels, destinations, accessibility, and whitespace.
- [x] Present the renamed footer preview and wait for approval before committing or pushing.

## Site audit: HIGH + MED fixes

- [x] Audit the built site for broken links, non-canonical links, canonicals/hreflang, headings, alt text, meta/OG/Twitter, JSON-LD, sitemap coverage, and orphans.
- [x] Fix the `blog.html` Organization logo schema URL (missing `/assets/`).
- [x] Add `og:site_name` and cap over-long `<title>` tags on poll pages.
- [x] Add `og:image`/`twitter:image` to the generated Bengali blog + article templates.
- [x] Add the 7 legacy poll pages to `sitemap.xml`.
- [x] Differentiate the duplicate Bengali article titles.
- [ ] Deferred (LOW): 82 `index.html` redirect-hop links, 10 missing `robots` meta, 3 orphan bn `article-*` pages, 2 long English companion titles.
