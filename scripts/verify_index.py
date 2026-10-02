"""Compare the Astro-built index pages against the original static HTML.

The old public/blog.html and public/polls.html were hand-maintained
(with regex-patched JSON-LD). This checks the Astro-generated
dist/blog.html and dist/polls.html reproduce them exactly:

  - every head tag (title, meta, canonical, og/twitter, stylesheets,
    defer scripts)
  - the JSON-LD blocks, compared as parsed structures (formatting
    differs: the original is hand-indented, Astro emits
    JSON.stringify(ld, null, 2))
  - <head> and <body> tag-for-tag after the JSON-LD blocks (compared
    above) and whitespace are factored out

Run: python scripts/verify_index.py [blog] [polls]   (default: both)
"""
import html as html_lib
import json
import os
import re
import subprocess
import sys

ROOT = r"C:\Users\saonb\git\coupleinbond-astro"
PAGES = ["blog", "polls"]


def grab(pattern, text, default=""):
    m = re.search(pattern, text, re.S)
    return m.group(1).strip() if m else default


def old_page(name):
    # The static files were git-rm'd with the migration commit, so the
    # original lives in the previous revision.
    for rev in ["HEAD", "HEAD~1", "main", "origin/main"]:
        r = subprocess.run(
            ["git", "-C", ROOT, "show", "%s:public/%s.html" % (rev, name)],
            capture_output=True)
        if r.returncode == 0:
            return r.stdout.decode("utf-8-sig")
    raise SystemExit("cannot read original public/%s.html from git" % name)


def norm(s):
    # HTML collapses inter-tag whitespace, and Astro's compiler condenses
    # it differently from the hand-written original — so compare with all
    # whitespace between tags removed. Text nodes (inside tags) keep
    # their single spaces.
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r">\s+<", "><", s)
    return s.strip()


def ld_blocks(html):
    return [json.loads(b.strip()) for b in re.findall(
        r'<script type="application/ld\+json"[^>]*>(.*?)</script>',
        html, re.S)]


def strip_ld(html):
    return re.sub(r'<script type="application/ld\+json"[^>]*>.*?'
                  r'</script>', "<JSONLD/>", html, flags=re.S)


def main():
    pages = sys.argv[1:] or PAGES
    failed = False
    for name in pages:
        old = old_page(name)
        new_path = os.path.join(ROOT, "dist", name + ".html")
        if not os.path.exists(new_path):
            print("OUTPUT MISSING:", new_path)
            return 1
        new = open(new_path, encoding="utf-8").read()
        checks = []

        def eq(label, a, b):
            ok = a == b
            checks.append((ok, label))
            if not ok:
                # ascii() keeps the diff printable on cp1252 consoles
                # (the copy contains emoji and curly quotes).
                print("  DIFF %s\n    old=%s\n    new=%s"
                      % (label, ascii(a), ascii(b)))

        eq("title",
           html_lib.unescape(grab(r"<title>(.*?)</title>", old)),
           html_lib.unescape(grab(r"<title>(.*?)</title>", new)))
        eq("meta description",
           html_lib.unescape(
               grab(r'<meta name="description" content="(.*?)"', old)),
           html_lib.unescape(
               grab(r'<meta name="description" content="(.*?)"', new)))
        eq("canonical",
           grab(r'<link rel="canonical" href="(.*?)"', old),
           grab(r'<link rel="canonical" href="(.*?)"', new))
        for prop in ["og:title", "og:description", "og:url", "og:image",
                     "og:type", "og:site_name", "og:locale", "og:image:alt",
                     "twitter:title", "twitter:description", "twitter:image",
                     "twitter:card"]:
            pat = r'<meta (?:property|name)="%s" content="(.*?)"' % re.escape(prop)
            eq(prop,
               html_lib.unescape(grab(pat, old)),
               html_lib.unescape(grab(pat, new)))
        eq("stylesheet hrefs",
           re.findall(r'<link rel="stylesheet" href="([^"]+)"', old),
           re.findall(r'<link rel="stylesheet" href="([^"]+)"', new))
        eq("script srcs",
           re.findall(r'<script src="([^"]+)"', old),
           re.findall(r'<script src="([^"]+)"', new))
        eq("h1",
           re.sub(r"<[^>]+>", "", grab(r"<h1[^>]*>(.*?)</h1>", old)).strip(),
           re.sub(r"<[^>]+>", "", grab(r"<h1[^>]*>(.*?)</h1>", new)).strip())
        eq("json-ld", ld_blocks(old), ld_blocks(new))

        for section in ("head", "body"):
            o = strip_ld(grab(r"<%s>(.*?)</%s>" % (section, section), old))
            n = strip_ld(grab(r"<%s>(.*?)</%s>" % (section, section), new))
            eq(section, norm(o), norm(n))

        passed = sum(1 for ok, _ in checks if ok)
        print("== %s.html: %d/%d checks passed ==" % (name, passed, len(checks)))
        for ok, label in checks:
            print(("  PASS  " if ok else "  FAIL  ") + label)
        failed = failed or passed != len(checks)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
