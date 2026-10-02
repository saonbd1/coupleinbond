"""Convert blog post HTML pages into Astro Markdown content.

Run:
  python scripts/migrate_blog.py <slug> [<slug> ...]
  python scripts/migrate_blog.py --all        # every remaining public/blog-posts/*.html

Single-post behaviour matches the first migration exactly, except
dates/section/tags now come from each page's own JSON-LD instead of
hard-coded values for the pilot post.
"""
import html as html_lib
import os
import re
import sys

ROOT = r"C:\Users\saonb\git\coupleinbond-astro"
PUBLIC_DIR = os.path.join(ROOT, "public", "blog-posts")
DST_DIR = os.path.join(ROOT, "src", "content", "blog")


def grab(pattern, text, default=""):
    m = re.search(pattern, text, re.S)
    return m.group(1).strip() if m else default


def migrate(slug):
    src = os.path.join(PUBLIC_DIR, slug + ".html")
    dst = os.path.join(DST_DIR, slug + ".md")
    if not os.path.exists(src):
        print("SOURCE MISSING:", src)
        return 1

    html = open(src, encoding="utf-8-sig").read()

    # <title> is the page/OG title; <h1> is the headline (they differ).
    # Titles may use an HTML entity (&mdash;) or a literal em dash for the
    # " — Couple in Bond" suffix; unescape first so both strip cleanly.
    page_title = grab(r"<title>(.*?)</title>", html)
    page_title = html_lib.unescape(page_title)
    page_title = page_title.replace(" — Couple in Bond", "").replace(" � Couple in Bond", "").strip()

    title = grab(r"<h1[^>]*>(.*?)</h1>", html)
    title = re.sub(r"<[^>]+>", "", title).strip()

    description = grab(r'<meta name="description" content="(.*?)"', html)
    kicker = grab(r'<div class="blog-kicker">(.*?)</div>', html)
    # Frontmatter holds decoded text; a raw &middot; would be
    # double-escaped by Astro and display literally.
    kicker = html_lib.unescape(kicker)
    dek = grab(r'<p class="article-dek">(.*?)</p>', html)
    date_line = grab(r'<div class="article-meta">(.*?)</div>', html)
    published = grab(r"<span>(Published.*?)</span>", date_line)
    author = grab(r"<span>By (.*?)</span>", date_line)
    disclaimer = grab(r'<footer class="article-footer">(.*?)</footer>', html)
    disclaimer = re.sub(r"<[^>]+>", "", disclaimer).strip()

    # The sidebar is real page content, not boilerplate — capture it verbatim.
    aside = grab(r'(<aside class="article-aside">.*?)</aside>', html)
    if aside and not aside.rstrip().endswith("</aside>"):
        aside = aside.rstrip() + "</aside>"

    # Body: everything inside article-body div (HTML stays inline in markdown)
    body = grab(r'<div class="article-body">(.*?)</div><footer class="article-footer">', html)
    if not body:
        body = grab(r'<div class="article-body">(.*?)</footer>', html)

    # JSON-LD carries its own description/section/keywords/dates.
    # NOTE: headline can differ from <h1> (older pages truncated it) —
    # preserve it verbatim for SEO continuity. Companions use a @graph
    # wrapper instead of a bare BlogPosting; the headline regex works either way.
    variant = "companion" if slug.endswith("-companion") else "editorial"
    ld_block = grab(r'<script type="application/ld\+json">\s*(\{.*?\})\s*</script>', html, "{}")
    ld_headline = grab(r'"headline":\s*"([^"]+)"', ld_block) or title
    schema_description = grab(r'"description":\s*"(.*?)"', ld_block)
    date_published = grab(r'"datePublished":\s*"([^"]+)"', ld_block) or "2026-08-14"
    date_modified = grab(r'"dateModified":\s*"([^"]+)"', ld_block) or date_published
    section = grab(r'"articleSection":\s*"([^"]+)"', ld_block) or "Relationships"
    keywords_raw = grab(r'"keywords":\s*\[(.*?)\]', ld_block)
    keywords = [k.strip().strip('"') for k in keywords_raw.split(",") if k.strip().strip('"')]
    tags = keywords[:3]

    def y(s):
        return s.replace('"', "'").replace("\\n", " ").strip()

    def yq(s):
        # quote YAML scalars so colons/quotes in copy cannot break parsing
        return '"%s"' % y(s)

    md = []
    md.append("---")
    md.append("title: %s" % yq(title))
    md.append("pageTitle: %s" % yq(page_title))
    md.append("description: %s" % yq(description))
    md.append("schemaDescription: %s" % yq(schema_description or description))
    md.append("kicker: %s" % yq(kicker))
    md.append("dek: %s" % yq(dek))
    md.append("publishedLabel: %s" % yq(published))
    # Quote dates: unquoted YYYY-MM-DD parses as a YAML Date, not a string.
    md.append('datePublished: "%s"' % date_published)
    md.append('dateModified: "%s"' % date_modified)
    md.append("section: %s" % yq(section))
    md.append("slug: %s" % slug)
    md.append("headline: %s" % yq(ld_headline))
    md.append("variant: %s" % variant)
    md.append("author: %s" % yq(author))
    md.append("disclaimer: %s" % yq(disclaimer))
    md.append("draft: false")
    md.append("keywords:")
    for k in keywords:
        md.append("  - %s" % yq(k))
    md.append("tags:")
    for t in tags:
        md.append("  - %s" % yq(t))
    # Raw HTML for the sidebar. |- keeps the markup intact as a literal block.
    if aside:
        md.append("asideHtml: |-")
        for line in aside.splitlines():
            md.append("  " + line.strip())
    else:
        md.append('asideHtml: ""')
    md.append("---")
    md.append("")
    md.append(body.strip())
    md.append("")

    os.makedirs(os.path.dirname(dst), exist_ok=True)
    open(dst, "w", encoding="utf-8", newline="\n").write("\n".join(md))

    print("OK wrote:", dst)
    print("  title       :", title[:70])
    print("  description :", description[:70])
    print("  body chars  :", len(body))
    return 0


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 1
    if args == ["--all"]:
        have = {f[:-3] for f in os.listdir(DST_DIR) if f.endswith(".md")} if os.path.isdir(DST_DIR) else set()
        args = sorted(f[:-5] for f in os.listdir(PUBLIC_DIR) if f.endswith(".html") and f[:-5] not in have)
        print("migrating %d remaining posts" % len(args))
    rc = 0
    for slug in args:
        rc |= migrate(slug)
    return rc


if __name__ == "__main__":
    sys.exit(main())
import os
import re
import sys

ROOT = r"C:\Users\saonb\git\coupleinbond-astro"
SRC = os.path.join(ROOT, "public", "blog-posts", "couple-bonding-activities-at-home.html")
DST = os.path.join(ROOT, "src", "content", "blog", "couple-bonding-activities-at-home.md")


def grab(pattern, text, default=""):
    m = re.search(pattern, text, re.S)
    return m.group(1).strip() if m else default


def main():
    if not os.path.exists(SRC):
        print("SOURCE MISSING:", SRC)
        return 1

    html = open(SRC, encoding="utf-8").read()

    # <title> is the page/OG title; <h1> is the headline (they differ).
    page_title = grab(r"<title>(.*?)</title>", html)
    page_title = page_title.replace(" — Couple in Bond", "").strip()

    title = grab(r"<h1[^>]*>(.*?)</h1>", html)
    title = re.sub(r"<[^>]+>", "", title).strip()

    description = grab(r'<meta name="description" content="(.*?)"', html)
    kicker = grab(r'<div class="blog-kicker">(.*?)</div>', html)
    dek = grab(r'<p class="article-dek">(.*?)</p>', html)
    date_line = grab(r'<div class="article-meta">(.*?)</div>', html)
    published = grab(r"<span>(Published.*?)</span>", date_line)
    author = grab(r'<span>By (.*?)</span>', date_line)
    disclaimer = grab(r'<footer class="article-footer">(.*?)</footer>', html)
    disclaimer = re.sub(r"<[^>]+>", "", disclaimer).strip()

    # The sidebar is real page content, not boilerplate — capture it verbatim.
    aside = grab(r'(<aside class="article-aside">.*?)</aside>', html)
    if not aside:
        aside = ""

    # Body: everything inside article-body div (HTML stays inline in markdown)
    body = grab(r'<div class="article-body">(.*?)</div><footer class="article-footer">', html)
    if not body:
        body = grab(r'<div class="article-body">(.*?)</footer>', html)

    # JSON-LD stays optional; Astro layout regenerates it later.
    section = "Couple Bonding"
    tags = ["couple bonding", "activities", "at home"]

    def y(s):
        return s.replace('"', "'").replace("\n", " ").strip()

    def yq(s):
        # quote YAML scalars so colons/quotes in copy cannot break parsing
        return '"%s"' % y(s)

    # JSON-LD carries its own description + keywords, distinct from the meta tags.
    ld_block = grab(r'<script type="application/ld\+json">\s*(\{.*?\})\s*</script>', html, "{}")
    schema_description = grab(r'"description":\s*"(.*?)"', ld_block)
    keywords_raw = grab(r'"keywords":\s*\[(.*?)\]', ld_block)
    keywords = [k.strip().strip('"') for k in keywords_raw.split(",") if k.strip()]

    md = []
    md.append("---")
    md.append("title: %s" % yq(title))
    md.append("pageTitle: %s" % yq(page_title))
    md.append("description: %s" % yq(description))
    md.append("schemaDescription: %s" % yq(schema_description))
    md.append("kicker: %s" % yq(kicker))
    md.append("dek: %s" % yq(dek))
    md.append("publishedLabel: %s" % yq(published))
    # Quote dates: unquoted YYYY-MM-DD parses as a YAML Date, not a string.
    md.append('datePublished: "%s"' % "2026-08-13")
    md.append('dateModified: "%s"' % "2026-08-13")
    md.append("section: %s" % yq(section))
    md.append("slug: couple-bonding-activities-at-home")
    md.append("author: %s" % yq(author))
    md.append("disclaimer: %s" % yq(disclaimer))
    md.append("draft: false")
    md.append("keywords:")
    for k in keywords:
        md.append("  - %s" % yq(k))
    md.append("tags:")
    for t in tags:
        md.append("  - %s" % yq(t))
    # Raw HTML for the sidebar. |- keeps the markup intact as a literal block.
    if aside:
        md.append("asideHtml: |-")
        for line in aside.splitlines():
            md.append("  " + line.strip())
    else:
        md.append('asideHtml: ""')
    md.append("---")
    md.append("")
    md.append(body.strip())
    md.append("")

    os.makedirs(os.path.dirname(DST), exist_ok=True)
    open(DST, "w", encoding="utf-8", newline="\n").write("\n".join(md))

    print("OK wrote:", DST)
    print("  title       :", title[:70])
    print("  description :", description[:70])
    print("  body chars  :", len(body))
    return 0


if __name__ == "__main__":
    sys.exit(main())
