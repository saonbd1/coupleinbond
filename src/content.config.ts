import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Blog posts live in src/content/blog/*.md.
// The schema mirrors the frontmatter our HTML-to-Markdown migrator emits,
// so a missing field fails the build instead of shipping an empty tag.
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    pageTitle: z.string(),
    description: z.string(),
    schemaDescription: z.string(),
    kicker: z.string(),
    dek: z.string(),
    publishedLabel: z.string(),
    datePublished: z.string(),
    dateModified: z.string(),
    section: z.string(),
    slug: z.string(),
    // Index-page card + ItemList fields, backfilled from the
    // hand-maintained public/blog.html by backfill_index_fields.py.
    // cardOrder is a recency rank (higher = newer; grid sorts desc).
    tag: z.string(),
    excerpt: z.string(),
    cardTitle: z.string(),
    cardOrder: z.number(),
    ldOrder: z.number(),
    headline: z.string().optional(),
    author: z.string(),
    disclaimer: z.string(),
    draft: z.boolean().default(false),
    keywords: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    asideHtml: z.string().default(""),
    // Machine-generated poll companions use a slightly different shell:
    // Blog/Polls/Calculator nav links and a two-link footer.
    variant: z.string().default("editorial"),
  }),
});

// Poll detail pages in src/content/polls/*.md, from scripts/migrate_polls.py.
// Options/related/companion links are frontmatter; the layout re-renders the
// voting scaffolding that poll-detail.js hydrates at runtime.
const polls = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/polls' }),
  schema: z.object({
    question: z.string(),
    pageTitle: z.string(),
    description: z.string(),
    intro: z.string(),
    topic: z.string(),
    slug: z.string(),
    // Index-page ItemList position, backfilled from public/polls.html.
    listOrder: z.number(),
    ogImage: z.string(),
    ogImageAlt: z.string().default(""),
    companionHref: z.string().optional(),
    companionTitle: z.string().optional(),
    options: z.array(z.string()).default([]),
    related: z.array(z.object({ href: z.string(), title: z.string() })).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, polls };
