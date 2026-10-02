"""Convert poll detail HTML pages into Astro Markdown content.

Run:
  python scripts/migrate_polls.py <slug> [<slug> ...]
  python scripts/migrate_polls.py --all   # every remaining public/polls/*.html

Poll pages are data-driven: question, options (from the fieldset labels),
topic label, intro, optional companion link, and two related links. All of
that becomes frontmatter; the layout re-renders the form/results scaffolding
that poll-detail.js hydrates at runtime. Related links stay as plain .html
hrefs so they keep working regardless of migration order.
"""
import html as html_lib
import os
import re
import sys

ROOT = r"C:\Users\saonb\git\coupleinbond-astro"
PUBLIC_DIR = os.path.join(ROOT, "public", "polls")
DST_DIR = os.path.join(ROOT, "src", "content", "polls")


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

    # <title> uses an entity (&mdash;) or literal em dash for the suffix.
    page_title = html_lib.unescape(grab(r"<title>(.*?)</title>", html))
    page_title = page_title.replace(" — Relationship Poll | Couple in Bond", "").strip()
    question = html_lib.unescape(grab(r"<h1[^>]*>(.*?)</h1>", html))
    question = re.sub(r"<[^>]+>", "", question).strip()
    description = html_lib.unescape(grab(r'<meta name="description" content="(.*?)"', html))
    intro = html_lib.unescape(grab(r'<p class="poll-detail-intro">(.*?)</p>', html))
    intro = re.sub(r"<[^>]+>", "", intro).strip()
    topic = grab(r'<nav class="poll-breadcrumbs".*?<span> / </span><span>(.*?)</span>', html)
    topic = html_lib.unescape(re.sub(r"<[^>]+>", "", topic)).strip()

    # Options come from the fieldset labels in order.
    fieldset = grab(r'<fieldset[^>]*>(.*?)</fieldset>', html)
    options = [html_lib.unescape(o).strip()
               for o in re.findall(r"<span>(.*?)</span>", fieldset, re.S)]

    # og:image varies: per-poll share art or the generic hero illustration.
    og_image = grab(r'<meta property="og:image" content="(.*?)"', html)
    og_alt = html_lib.unescape(grab(r'<meta property="og:image:alt" content="(.*?)"', html))

    # Optional companion section (only polls with a generated article).
    # NOTE: grab() returns default "" when absent, but patterns without a
    # capture group raise IndexError — so match inline here instead.
    comp_m = re.search(r'(<section class="poll-companion".*?</section>)', html, re.S)
    comp_block = comp_m.group(1) if comp_m else ""
    comp_href = grab(r'<a class="poll-companion-link" href="([^"]+)"', comp_block)
    comp_title = ""
    if comp_block:
        comp_title = html_lib.unescape(grab(r'poll-companion-link"[^>]*>(.*?)<span', comp_block))
        comp_title = re.sub(r"<[^>]+>", "", comp_title).strip()

    # Two related cards: (href, title) pairs.
    related = [(href, html_lib.unescape(t).strip()) for href, t in
               re.findall(r'poll-related-card" href="([^"]+)"><span>Related poll</span><strong>(.*?)</strong>', html, re.S)]

    def y(s):
        return s.replace('"', "'").replace("\\n", " ").strip()

    def yq(s):
        return '"%s"' % y(s)

    md = []
    md.append("---")
    md.append("question: %s" % yq(question))
    md.append("pageTitle: %s" % yq(page_title))
    md.append("description: %s" % yq(description))
    md.append("intro: %s" % yq(intro))
    md.append("topic: %s" % yq(topic))
    md.append("slug: %s" % slug)
    md.append("ogImage: %s" % yq(og_image))
    md.append("ogImageAlt: %s" % yq(og_alt))
    if comp_href:
        md.append("companionHref: %s" % yq(comp_href))
        md.append("companionTitle: %s" % yq(comp_title))
    md.append("options:")
    for o in options:
        md.append("  - %s" % yq(o))
    md.append("related:")
    for href, t in related:
        md.append("  - href: %s" % yq(href))
        md.append("    title: %s" % yq(t))
    md.append("draft: false")
    md.append("---")
    md.append("")

    os.makedirs(os.path.dirname(dst), exist_ok=True)
    open(dst, "w", encoding="utf-8", newline="\n").write("\n".join(md))

    print("OK wrote:", dst)
    print("  question :", question[:70])
    print("  options  :", len(options), "| related:", len(related),
          "| companion:", bool(comp_href))
    return 0


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 1
    if args == ["--all"]:
        have = {f[:-3] for f in os.listdir(DST_DIR) if f.endswith(".md")} if os.path.isdir(DST_DIR) else set()
        args = sorted(f[:-5] for f in os.listdir(PUBLIC_DIR) if f.endswith(".html") and f[:-5] not in have)
        print("migrating %d remaining polls" % len(args))
    rc = 0
    for slug in args:
        rc |= migrate(slug)
    return rc


if __name__ == "__main__":
    sys.exit(main())
