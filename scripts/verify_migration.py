"""Compare Astro-built output against the original hand-written page.

Run: python scripts/verify_migration.py
"""
import json
import os
import re
import subprocess
import sys

ROOT = r"C:\Users\saonb\git\coupleinbond-astro"
SLUG = "couple-bonding-activities-at-home"
REL = "public/blog-posts/%s.html" % SLUG


def grab(pattern, text, default=""):
    m = re.search(pattern, text, re.S)
    return m.group(1).strip() if m else default


def ld_json(html, index=0, strip_attrs=False):
    if strip_attrs:
        blocks = re.findall(
            r'<script type="application/ld\+json"[^>]*>(.*?)</script>', html, re.S)
    else:
        blocks = re.findall(
            r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
    if index >= len(blocks):
        return None
    try:
        return json.loads(blocks[index].strip())
    except Exception as exc:
        return {"_error": str(exc)}


def main():
    original = subprocess.run(
        ["git", "-C", ROOT, "show", "HEAD:%s" % REL],
        capture_output=True, text=True, encoding="utf-8")
    if original.returncode != 0:
        print("cannot read original from git:", original.stderr[:200])
        return 1

    out_path = os.path.join(ROOT, "dist", "blog-posts", SLUG + ".html")
    if not os.path.exists(out_path):
        print("OUTPUT MISSING:", out_path)
        return 1

    old = original.stdout
    new = open(out_path, encoding="utf-8").read()

    checks = []

    def eq(label, a, b):
        ok = a == b
        checks.append((ok, label))
        if not ok:
            print("  DIFF %s\n    old=%r\n    new=%r" % (label, a, b))

    eq("title", grab(r"<title>(.*?)</title>", old), grab(r"<title>(.*?)</title>", new))
    eq("meta description",
       grab(r'<meta name="description" content="(.*?)"', old),
       grab(r'<meta name="description" content="(.*?)"', new))
    eq("canonical",
       grab(r'<link rel="canonical" href="(.*?)"', old),
       grab(r'<link rel="canonical" href="(.*?)"', new))
    for prop in ["og:title", "og:description", "og:url", "og:image", "og:type",
                 "twitter:title", "twitter:description", "twitter:image"]:
        eq(prop,
           grab(r'<meta property="%s" content="(.*?)"' % prop, old) or
           grab(r'<meta name="%s" content="(.*?)"' % prop, old),
           grab(r'<meta property="%s" content="(.*?)"' % prop, new) or
           grab(r'<meta name="%s" content="(.*?)"' % prop, new))

    # h1 + every h2 in the body must survive the markdown round-trip
    eq("h1", re.sub(r"<[^>]+>", "", grab(r"<h1>(.*?)</h1>", old)),
       re.sub(r"<[^>]+>", "", grab(r"<h1>(.*?)</h1>", new)))
    eq("h2 list", re.findall(r"<h2>(.*?)</h2>", old), re.findall(r"<h2>(.*?)</h2>", new))

    # body word count should match closely
    def words(html):
        body = grab(r'<div class="article-body">(.*?)</div><footer', html) or \
               grab(r'<div class="article-body">(.*?)</footer>', html)
        return len(re.sub(r"<[^>]+>", " ", body).split())
    ow, nw = words(old), words(new)
    ok = abs(ow - nw) <= 5
    checks.append((ok, "body word count (old=%d new=%d)" % (ow, nw)))
    if not ok:
        print("  DIFF body words old=%d new=%d" % (ow, nw))

    # JSON-LD BlogPosting equivalence (ignore formatting)
    old_ld = ld_json(old, 0)
    new_ld = ld_json(new, 0)
    if new_ld is None:
        new_ld = ld_json(new, 0, strip_attrs=True)
    if old_ld and new_ld and "_error" not in new_ld:
        for key in ["headline", "description", "url", "datePublished",
                    "articleSection", "keywords"]:
            eq("ld.%s" % key, old_ld.get(key), new_ld.get(key))
    else:
        checks.append((False, "ld parse old=%s new=%s" % (old_ld is not None, new_ld)))

    # structural bits that must not regress
    for label, pat in [("blog.css", r'<link rel="stylesheet" href="\.\./blog\.css">'),
                       ("blog-nav.js", r'<script src="\.\./blog-nav\.js"'),
                       ("article-body", r'<div class="article-body">'),
                       ("article-footer", r'<footer class="article-footer">'),
                       ("blog-footer", r'<footer class="blog-footer">'),
                       ("disclaimer text",
                        r"It is not therapy or professional relationship advice\.")]:
        checks.append((re.search(pat, new) is not None, label))

    # relative asset hrefs must be identical in form (../)
    eq("stylesheet hrefs",
       re.findall(r'<link rel="stylesheet" href="([^"]+)"', old),
       re.findall(r'<link rel="stylesheet" href="([^"]+)"', new))

    passed = sum(1 for ok, _ in checks if ok)
    print("\n== %d/%d checks passed ==" % (passed, len(checks)))
    for ok, label in checks:
        print(("  PASS  " if ok else "  FAIL  ") + label)
    return 0 if passed == len(checks) else 1


if __name__ == "__main__":
    sys.exit(main())
