"""Compare Astro-built poll output against the original page.

Run: python scripts/verify_poll.py [<slug>]
"""
import html as html_lib
import json
import os
import re
import subprocess
import sys

ROOT = r"C:\Users\saonb\git\coupleinbond-astro"
SLUG = sys.argv[1] if len(sys.argv) > 1 else "weekly-ritual"
REL = "public/polls/%s.html" % SLUG


def grab(pattern, text, default=""):
    m = re.search(pattern, text, re.S)
    return m.group(1).strip() if m else default


def main():
    for rev in ["HEAD:%s" % REL, "HEAD~1:%s" % REL, "main:%s" % REL,
                "origin/main:public/polls/%s.html" % SLUG]:
        original = subprocess.run(
            ["git", "-C", ROOT, "show", rev],
            capture_output=True, text=True, encoding="utf-8-sig")
        if original.returncode == 0:
            break
    if original.returncode != 0:
        print("cannot read original from git:", original.stderr[:200])
        return 1

    out_path = os.path.join(ROOT, "dist", "polls", SLUG + ".html")
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

    # HEAD CHECKS
    # entity-encoded titles (&mdash; etc.) need unescaping on both sides.
    eq("title",
       html_lib.unescape(grab(r"<title>(.*?)</title>", old)),
       html_lib.unescape(grab(r"<title>(.*?)</title>", new)))
    eq("meta description",
       html_lib.unescape(grab(r'<meta name="description" content="(.*?)"', old)),
       html_lib.unescape(grab(r'<meta name="description" content="(.*?)"', new)))
    eq("canonical",
       grab(r'<link rel="canonical" href="(.*?)"', old),
       grab(r'<link rel="canonical" href="(.*?)"', new))
    for prop in ["og:title", "og:description", "og:url", "og:image",
                 "twitter:title", "twitter:description", "twitter:image"]:
        eq(prop,
           html_lib.unescape(grab(r'<meta property="%s" content="(.*?)"' % prop, old) or
           grab(r'<meta name="%s" content="(.*?)"' % prop, old)),
           html_lib.unescape(grab(r'<meta property="%s" content="(.*?)"' % prop, new) or
           grab(r'<meta name="%s" content="(.*?)"' % prop, new)))
    eq("h1",
       html_lib.unescape(re.sub(r"<[^>]+>", "", grab(r"<h1>(.*?)</h1>", old))).strip(),
       html_lib.unescape(re.sub(r"<[^>]+>", "", grab(r"<h1>(.*?)</h1>", new))).strip())
    eq("topic",
       html_lib.unescape(grab(r'<nav class="poll-breadcrumbs".*?<span> / </span><span>(.*?)</span>', old)),
       html_lib.unescape(grab(r'<nav class="poll-breadcrumbs".*?<span> / </span><span>(.*?)</span>', new)))
    eq("options",
       [html_lib.unescape(o).strip() for o in re.findall(r'poll-detail-option"><input[^>]*><span>(.*?)</span>', old)],
       [html_lib.unescape(o).strip() for o in re.findall(r'poll-detail-option"><input[^>]*><span>(.*?)</span>', new)])
    eq("related hrefs",
       re.findall(r'poll-related-card" href="([^"]+)"', old),
       re.findall(r'poll-related-card" href="([^"]+)"', new))
    eq("related titles",
       [html_lib.unescape(t).strip() for t in re.findall(r'poll-related-card"[^>]*><span>Related poll</span><strong>(.*?)</strong>', old)],
       [html_lib.unescape(t).strip() for t in re.findall(r'poll-related-card"[^>]*><span>Related poll</span><strong>(.*?)</strong>', new)])
    # COMPANION CHECKS
    eq("companion section",
       re.search(r'<section class="poll-companion"', old) is not None,
       re.search(r'<section class="poll-companion"', new) is not None)
    if re.search(r'<section class="poll-companion"', old):
        eq("companion href",
           grab(r'<a class="poll-companion-link" href="([^"]+)"', old),
           grab(r'<a class="poll-companion-link" href="([^"]+)"', new))
        eq("companion title",
           html_lib.unescape(re.sub(r"<[^>]+>", " ", grab(r'poll-companion-link"[^>]*>(.*?)</a>', old))).strip(),
           html_lib.unescape(re.sub(r"<[^>]+>", " ", grab(r'poll-companion-link"[^>]*>(.*?)</a>', new))).strip())
    # LD CHECKS
    old_g, new_g = ld_graph(old), ld_graph(new)
    if "_error" in new_g:
        checks.append((False, "ld parse new=%s" % new_g["_error"]))
    else:
        for key in ["name", "description", "url"]:
            eq("ld.webpage.%s" % key,
               (old_g.get("WebPage") or {}).get(key),
               (new_g.get("WebPage") or {}).get(key))
        for key in ["name", "description", "answerCount"]:
            eq("ld.question.%s" % key,
               (old_g.get("Question") or {}).get(key),
               (new_g.get("Question") or {}).get(key))
        eq("ld.answers",
           [a.get("text") for a in (old_g.get("Question") or {}).get("suggestedAnswer", [])],
           [a.get("text") for a in (new_g.get("Question") or {}).get("suggestedAnswer", [])])
        eq("ld.breadcrumb.len",
           len((old_g.get("BreadcrumbList") or {}).get("itemListElement", [])),
           len((new_g.get("BreadcrumbList") or {}).get("itemListElement", [])))
    # STRUCTURE CHECKS
    for label, pat in [("polls.css", r'<link rel="stylesheet" href="\.\./polls\.css">'),
                       ("poll-detail.css", r'<link rel="stylesheet" href="\.\./poll-detail\.css">'),
                       ("poll-data.js", r'<script src="\.\./poll-data\.js"'),
                       ("poll-detail.js", r'<script src="\.\./poll-detail\.js"'),
                       ("poll form", r'<form id="pollDetailForm"'),
                       ("poll results", r'<section id="pollDetailResults"'),
                       ("blog-footer", r'<footer class="blog-footer">'),
                       ("data-poll-id", r'<body data-poll-id="%s"' % SLUG)]:
        checks.append((re.search(pat, new) is not None, label))
    # REPORT
    passed = sum(1 for ok, _ in checks if ok)
    print("\n== %d/%d checks passed ==" % (passed, len(checks)))
    for ok, label in checks:
        print(("  PASS  " if ok else "  FAIL  ") + label)
    return 0 if passed == len(checks) else 1


def ld_graph(html):
    m = re.search(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', html, re.S)
    if not m:
        return {}
    try:
        doc = json.loads(m.group(1).strip())
    except Exception as exc:
        return {"_error": str(exc)}
def ld_graph(html):
    m = re.search(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', html, re.S)
    if not m:
        return {}
    try:
        doc = json.loads(m.group(1).strip())
    except Exception as exc:
        return {"_error": str(exc)}
    nodes = {}
    for node in doc.get("@graph", []):
        if isinstance(node, dict) and "@type" in node:
            nodes[node["@type"]] = node
    return nodes


if __name__ == "__main__":
    sys.exit(main())
