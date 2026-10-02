"""Backfill index-page fields into content frontmatter (one-time).

The Astro index pages (src/pages/blog.astro, src/pages/polls.astro)
generate their card grids and ItemList JSON-LD from the content
collections. The hand-maintained public/blog.html and public/polls.html
carried per-post data that the per-page migrators never captured:

  blog:  tag, excerpt, cardTitle (card <h3> — occasionally a
         shorter form than the page <h1>), cardOrder (recency rank:
         higher = newer; the visible grid sorts descending so a new
         companion with max+1 prepends), ldOrder (ItemList JSON-LD
         position)
  polls: listOrder (ItemList position == poll-data.js render order)

This script reads the current index pages and writes those fields into
each content file's frontmatter, right after the `slug:` line. Run once
per repo state; safe to re-run only after `git checkout` of the content
files (it refuses to overwrite fields that already exist).
"""
import html as html_lib
import os
import re
import subprocess

ROOT = r"C:\Users\saonb\git\coupleinbond-astro"


def read_old_index(name):
    """The hand-maintained index pages were git-rm'd with the Astro
    migration, so read the original bytes from git."""
    for rev in ["HEAD", "HEAD~1", "main", "origin/main"]:
        r = subprocess.run(
            ["git", "-C", ROOT, "show", "%s:public/%s.html" % (rev, name)],
            capture_output=True)
        if r.returncode == 0:
            return r.stdout.decode("utf-8-sig")
    raise SystemExit("cannot read original public/%s.html from git" % name)


def grab(pattern, text, default=""):
    m = re.search(pattern, text, re.S)
    return m.group(1).strip() if m else default


def yq(s):
    # YAML double-quoted scalar; escape embedded quotes/backslashes.
    return '"%s"' % s.replace("\\", "\\\\").replace('"', '\\"')


def inject(path, fields):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    m = re.match(r"---\n(.*?)\n---\n", text, re.S)
    if not m:
        raise SystemExit("no frontmatter in " + path)
    body = m.group(1)
    for key, _ in fields:
        if re.search(r"^%s:" % re.escape(key), body, re.M):
            raise SystemExit("field %s already present in %s" % (key, path))
    slug_m = re.search(r"^slug:.*$", body, re.M)
    if not slug_m:
        raise SystemExit("no slug line in " + path)
    block = "\n".join("%s: %s" % (k, v) for k, v in fields)
    body = body[:slug_m.end()] + "\n" + block + body[slug_m.end():]
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("---\n" + body + "\n---\n" + text[m.end():])


def read_md_scalar(path, key):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    m = re.search(r"^%s: \"(.*)\"$" % re.escape(key), text, re.M)
    return m.group(1) if m else None


def backfill_blog():
    html = read_old_index("blog")

    # Visible card grid, in document order (newest first).
    cards = re.findall(r'<article class="blog-card">(.*?)</article>',
                       html, re.S)
    if len(cards) != 16:
        raise SystemExit("expected 16 cards, found %d" % len(cards))

    # ItemList JSON-LD positions (a different, hand-maintained order).
    ld_block = grab(
        r'<script type="application/ld\+json">\s*(\{.*?\})\s*</script>',
        html, "{}")
    ld_items = re.findall(
        r'\{ "@type": "ListItem", "position": (\d+), '
        r'"url": "https://couplein\.bond/blog-posts/([^"]+)\.html", '
        r'"name": "(.*?)" \}', ld_block)
    ld_order = {}
    ld_names = {}
    for pos, slug, name in ld_items:
        ld_order[slug] = int(pos)
        ld_names[slug] = html_lib.unescape(name)
    if len(ld_order) != 16:
        raise SystemExit("expected 16 ItemList entries, found %d"
                         % len(ld_order))

    # Card grid is newest-first; store a recency rank (higher = newer)
    # so the Astro page can sort descending and the daily generator can
    # hand new companions max+1 to prepend them.
    for i, card in enumerate(cards):
        card_order = len(cards) - i
        slug = grab(r'href="blog-posts/(.*?)\.html"', card)
        tag = grab(r'<span class="blog-tag">(.*?)</span>', card)
        read_time = grab(r'<span>(\d+ min read)</span>', card)
        card_title = html_lib.unescape(
            grab(r'<h3><a href="blog-posts/[^"]+">(.*?)</a></h3>', card))
        excerpt = html_lib.unescape(grab(r"</h3>\s*<p>(.*?)</p>", card))

        md = os.path.join(ROOT, "src", "content", "blog", slug + ".md")
        if not os.path.exists(md):
            raise SystemExit("content file missing for card " + slug)
        if ld_names.get(slug) != card_title:
            raise SystemExit(
                "ItemList name != card h3 for %s:\n  %r\n  %r"
                % (slug, ld_names.get(slug), card_title))
        kicker = read_md_scalar(md, "kicker") or ""
        if read_time not in kicker:
            raise SystemExit("card read time %r not in kicker for %s"
                             % (read_time, slug))

        inject(md, [
            ("tag", yq(tag)),
            ("excerpt", yq(excerpt)),
            ("cardTitle", yq(card_title)),
            ("cardOrder", str(card_order)),
            ("ldOrder", str(ld_order[slug])),
        ])
        print("blog  %-52s tag=%-14s card=%2d ld=%2d"
              % (slug, tag, card_order, ld_order[slug]))


def backfill_polls():
    html = read_old_index("polls")
    ld_block = grab(
        r'<script type="application/ld\+json" data-seo-enhancement>'
        r'\s*(\{.*?\})\s*</script>', html, "{}")
    items = re.findall(
        r'\{ "@type": "ListItem", "position": (\d+), "name": "(.*?)", '
        r'"url": "https://couplein\.bond/polls/([^"]+)\.html" \}',
        ld_block)
    if len(items) != 17:
        raise SystemExit("expected 17 ItemList entries, found %d"
                         % len(items))
    for pos, name, slug in items:
        md = os.path.join(ROOT, "src", "content", "polls", slug + ".md")
        if not os.path.exists(md):
            raise SystemExit("content file missing for poll " + slug)
        question = read_md_scalar(md, "question")
        if question != html_lib.unescape(name):
            raise SystemExit("ItemList name != question for %s:\n  %r\n  %r"
                             % (slug, name, question))
        inject(md, [("listOrder", pos)])
        print("polls %-46s listOrder=%2s" % (slug, pos))


if __name__ == "__main__":
    backfill_blog()
    backfill_polls()
    print("done")
