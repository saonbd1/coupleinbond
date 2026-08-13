# CoupleIn Bond SEO Implementation Brief

## Scope and method

This brief covers the 15-page public CoupleIn Bond static site. The goal is to make every page easier to understand, crawl, and choose in search without changing the existing pink-to-lilac visual system or the lighthearted Web3 positioning.

The recommendations use the current site audit, the existing worldwide keyword research workbooks, and public Google Search Central guidance. Google recommends unique, descriptive titles and a clear main heading. Google describes meta descriptions as short, page-specific summaries that can support snippets. Google recommends valid JSON-LD that describes visible content. A sitemap supports URL discovery, while robots.txt provides crawl guidance but does not replace indexing controls.[1] [2] [3] [4] [5]

## Priority order

| Priority | Work | Reason |
|---|---|---|
| P0 | Add sitemap.xml and robots.txt, and make sure all public URLs use the canonical domain. | The audit found that crawl files are missing. These files provide a clear discovery and crawl layer. |
| P0 | Fix About and Privacy heading semantics. | Both pages use visual `section-title` blocks instead of semantic H2 headings. |
| P0 | Remove stale placeholder social-image descriptions and add deployable Open Graph and Twitter images. | Placeholder metadata can weaken page understanding and social previews. |
| P1 | Give every page a unique title, description, H1, and intent-focused H2 structure. | The audit found short descriptions, an overly short About title, and long editorial titles. |
| P1 | Add page-specific JSON-LD only where it describes visible content. | Tools, FAQs, editorial pages, About, Contact, and Privacy have different content types. |
| P1 | Strengthen internal links between the calculator, compatibility quiz, polls, blog, quotes, and seasonal pages. | The site already has useful tools and content. Contextual links can clarify the topic cluster. |
| P2 | Add consistent Twitter metadata and refine Open Graph titles and descriptions. | Most pages have incomplete Twitter cards, and several pages have stale or missing social images. |
| P2 | Add a repeatable SEO validator for title length, description length, H1 count, heading order, JSON-LD parseability, and crawl files. | The existing validator checks basic fields but not the full SEO contract. |

## Page-level SEO map

The target titles below are concise and distinct. The descriptions are written as page-specific summaries, not keyword lists. Each page must keep one visible H1. H2 headings organize main sections. H3 headings identify subsections inside an H2. H4-H6 are reserved for real nested content and must not be added only to increase heading depth.

| URL | Primary intent | Recommended title | Recommended H1 | Recommended H2 sections | Recommended schema |
|---|---|---|---|---|---|
| `/index.html` | Navigational and tool discovery | Couple in Bond — Love Tools, Relationship Ideas & Ink Chain Keepsakes | Make room for more love. | Start with a playful tool; From the blog; Community polls; Keep the moment | `WebSite`, `Organization` |
| `/calculator.html` | Love calculator and Web3 tool | Love Calculator by Name — Couple in Bond | Love Calculator by Name | What does a love calculator do?; Mint your playful score on Ink Chain; Before you trust the score | `SoftwareApplication`, `FAQPage`, `WebPage` |
| `/compatibility-quiz.html` | Compatibility reflection | Relationship Compatibility Quiz — Couple in Bond | Relationship Compatibility Quiz | How the reflection works; What your result can suggest; Relationship tips; Compatibility quiz questions | `WebApplication`, `FAQPage`, `WebPage` |
| `/blog.html` | Editorial discovery | Relationship & Couple Bonding Blog — Couple in Bond | Relationship and Couple Bonding Blog | Featured post; Latest relationship ideas; Explore by topic | `Blog`, `ItemList`, `Organization` |
| `/polls.html` | Community interaction | Relationship Polls & Couple Questions — Couple in Bond | Community Relationship Polls | Choose a topic; Vote on a question; Browse poll topics | `CollectionPage`, `ItemList` |
| `/quotes.html` | Love quote discovery | Love Quotes for Couples — Couple in Bond | Love Quotes for Couples | Short lines for real moments; Share a thoughtful line | `CollectionPage`, `ItemList` |
| `/contact.html` | Contact and feedback | Contact Couple in Bond — Feedback & Ideas | Contact Couple in Bond | Send feedback; What to include; Form notes | `ContactPage`, `Organization` |
| `/valentines-day.html` | Seasonal information | Valentine’s Day Ideas for Couples and Friends — Couple in Bond | Valentine’s Day Ideas for Couples and Friends | At-home date ideas; Long-distance Valentine’s Day ideas; More ways to connect | `Article`, `CollectionPage` |
| `/about.html` | Brand and product explanation | About Couple in Bond — Love Tools and Web3 Keepsakes | About Couple in Bond | Our mission; What the tools do; Ink Chain keepsakes; Privacy approach | `AboutPage`, `Organization` |
| `/privacy.html` | Policy information | Privacy Policy — Couple in Bond | Privacy Policy | Information this site uses; Browser-based tools; Wallet and blockchain actions; Contact and updates | `PrivacyPolicy` |
| `/blog-posts/couple-bonding-activities-at-home.html` | Relationship ideas | Couple Bonding Activities at Home — Couple in Bond | Couple Bonding Activities at Home | Why small rituals help; At-home activities; Make one idea your own | `BlogPosting` |
| `/blog-posts/couples-communication-exercises.html` | Communication tips | Couples Communication Exercises — Couple in Bond | Couples Communication Exercises | Start with a calm check-in; Exercises for better conversations; Keep the habit simple | `BlogPosting` |
| `/blog-posts/galentines-day-ideas-self-love.html` | Seasonal friendship and self-love | Galentine’s Day Ideas for Self-Love and Friendship — Couple in Bond | Galentine’s Day Ideas for Self-Love and Friendship | What Galentine’s Day means; Ideas for friends; Make space for self-love | `BlogPosting` |
| `/blog-posts/valentines-day-date-ideas-at-home.html` | Seasonal date ideas | Valentine’s Day Date Ideas at Home — Couple in Bond | Valentine’s Day Date Ideas at Home | Low-cost date ideas; Food and ritual ideas; Long-distance variations | `BlogPosting` |
| `/blog-posts/why-modern-dating-feels-so-hard.html` | Relationship advice | Why Modern Dating Feels So Hard — Couple in Bond | Why Modern Dating Feels So Hard | Why dating can feel tiring; How to reduce pressure; Questions worth asking | `BlogPosting` |

## Heading rules

Each page must use one H1 that matches the visible page purpose. The H1 must not be the brand name alone. Use H2 for major sections and H3 for child topics. Do not jump from H1 to H4. Do not use a heading only for visual styling; use CSS classes for visual text. Replace About and Privacy `section-title` blocks with H2 elements. Keep the footer brand as a link or paragraph, not a competing H1.

## Metadata rules

Every page must have one title, one meta description, one canonical URL, and one favicon declaration. The title must describe the page and stay distinct from other pages. The description must summarize the page in plain English, include the primary intent naturally, and avoid a keyword list. Open Graph and Twitter fields must use the same canonical page intent. Use a deployable image path for social previews. Do not use a placeholder image URL.

## Structured-data rules

Use JSON-LD. Keep the schema type aligned with visible content. Use `FAQPage` only when the questions and answers are visible on the page. Use `BlogPosting` on the five editorial articles. Use `SoftwareApplication` or `WebApplication` for the tools, but do not add ratings, reviews, or invented user counts. Add `BreadcrumbList` only when the breadcrumb is visible or clearly represented in the page navigation.

## Crawl and internal-link rules

Create a sitemap that lists the 15 public canonical URLs. Create a robots.txt file that allows public crawling and points to the sitemap. Keep internal links relative in the static repository, but use the canonical domain in metadata. Link each tool to a relevant editorial or explanatory page. Link each editorial page back to the calculator, compatibility quiz, or polls only where the link helps the reader.

## Validation contract

The final validator must check the following for all 15 pages: title presence and uniqueness, title length, description presence and uniqueness, canonical count, favicon, Open Graph and Twitter fields, one H1, valid heading order, JSON-LD parseability, visible-schema consistency, broken internal links, no placeholder social copy, sitemap coverage, and robots.txt sitemap reference. The validator must not require a fixed FAQ count when page content changes; it must check that the visible FAQ items match the FAQPage schema instead.

## References

[1]: https://developers.google.com/search/docs/appearance/title-link "Google Search Central: Influencing title links in Google Search"
[2]: https://developers.google.com/search/docs/appearance/snippet "Google Search Central: Control your snippets in search results"
[3]: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data "Google Search Central: Introduction to structured data markup"
[4]: https://developers.google.com/search/docs/crawling-indexing/robots/intro "Google Search Central: Robots.txt introduction and guide"
[5]: https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview "Google Search Central: What is a sitemap?"
