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
    author: z.string(),
    disclaimer: z.string(),
    draft: z.boolean().default(false),
    keywords: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    asideHtml: z.string().default(""),
  }),
});

export const collections = { blog };
