#!/usr/bin/env python3
"""Compatibility Poll Generator for Couple in Bond.

Generates one compatibility-themed poll per run, linked to an existing
compatibility keyword blog article.  Designed to be called once per day
via Task Scheduler or a Cline schedule until all 5 compatibility polls
are published.

Usage:
    python scripts/compatibility_polls.py              # publish next poll
    python scripts/compatibility_polls.py --dry-run    # preview only
    python scripts/compatibility_polls.py --commit     # commit after publish
    python scripts/compatibility_polls.py --push       # commit + push

Idempotent: scripts/compatibility_poll_history.json tracks published ids.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import subprocess
import sys

SITE_URL = "https://couplein.bond"
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(REPO_ROOT, "public")
POLL_DATA_JS = os.path.join(PUBLIC_DIR, "poll-data.js")
SITEMAP_XML = os.path.join(PUBLIC_DIR, "sitemap.xml")
HISTORY_FILE = os.path.join(REPO_ROOT, "scripts", "compatibility_poll_history.json")
POLLS_DIR = os.path.join(REPO_ROOT, "src", "content", "polls")
BLOG_POSTS_DIR = os.path.join(REPO_ROOT, "src", "content", "blog")

OG_IMAGE = "https://couplein.bond/assets/polls-hero-illustration.png"
OG_IMAGE_ALT = "Hands placing colorful relationship poll cards into a ballot box"

# ---------------------------------------------------------------------------
# Five compatibility polls, each linked to one existing keyword article.
# Published in order: index 0 first, index 4 last.
# ---------------------------------------------------------------------------
COMPATIBILITY_POLLS = [
    {
        "slug_base": "which-compatibility-quiz-topic",
        "topic": "Relationships",
        "question": "Which topic matters most in a relationship compatibility quiz?",
        "pageTitle": "Which topic matters most in a relationship compatibility quiz?",
        "description": "Vote on the theme that tells you the most about whether two people fit well together.",
        "intro": "Compatibility quizzes cover many themes. This poll asks which one actually predicts a good conversation and a good relationship. Vote, then bring your answer to your partner tonight.",
        "options": ["How we handle conflict", "Our daily routines and habits", "Shared values and future goals", "How we communicate day to day"],
        "companion_href": "../blog-posts/relationship-compatibility-quiz.html",
        "companion_title": "Relationship Compatibility Quiz: A Better Way to Start the Conversation",
    },
    {
        "slug_base": "biggest-compatibility-dealbreaker",
        "topic": "Relationships",
        "question": "What is the biggest compatibility dealbreaker for you?",
        "pageTitle": "What is the biggest compatibility dealbreaker for you?",
        "description": "Vote on the difference that would make you rethink a relationship.",
        "intro": "Every couple argues about small things. But some differences feel heavier than others. This poll asks which gap would make you pause and ask are we actually compatible. Vote honestly, then talk about it with your partner.",
        "options": ["Different views on honesty", "One person always gives more effort", "Clashing life goals and timelines", "Different ways of handling emotions"],
        "companion_href": "../blog-posts/are-we-compatible-quiz.html",
        "companion_title": "Are We Compatible Quiz: Better Questions, Clearer Answers",
    },
    {
        "slug_base": "what-to-learn-early-relationship",
        "topic": "Connection",
        "question": "What should new couples learn about each other first?",
        "pageTitle": "What should new couples learn about each other first?",
        "description": "Vote on the first thing you wish you had understood when a relationship was new.",
        "intro": "Early love moves fast. Before the next date, this poll asks which area of compatibility deserves your attention first. Vote, share your answer, and turn it into a real conversation.",
        "options": ["How they handle a bad day", "Their ideal weekend routine", "How they apologize and repair", "What they expect from commitment"],
        "companion_href": "../blog-posts/compatibility-quiz-for-new-couples.html",
        "companion_title": "Compatibility Quiz for New Couples: What to Notice Before You Rush Ahead",
    },
    {
        "slug_base": "best-compatibility-question",
        "topic": "Connection",
        "question": "Which compatibility question reveals the most about a couple?",
        "pageTitle": "Which compatibility question reveals the most about a couple?",
        "description": "Vote on the question that would surprise you most by how differently your partner answers.",
        "intro": "Not all questions are equal. Some open a door you did not know was closed. This poll asks which compatibility question reveals the most and it might change how you talk tonight. Vote, then ask your partner.",
        "options": ["What helps you feel heard?", "What does fair disagreement look like?", "Which value would you never compromise?", "What small action makes you feel close?"],
        "companion_href": "../blog-posts/relationship-compatibility-questions-quiz.html",
        "companion_title": "Relationship Compatibility Questions Quiz: 20 Prompts for Honest Conversations",
    },
    {
        "slug_base": "long-term-couples-check-in",
        "topic": "Connection",
        "question": "What do long-term couples most need to check in about?",
        "pageTitle": "What do long-term couples most need to check in about?",
        "description": "Vote on the area that long relationships forget to revisit until it feels urgent.",
        "intro": "Long love changes shape. The needs that worked two years ago may not describe today. This poll asks which area of your relationship deserves a check-in right now. Vote honestly, then use it as a gentle conversation starter.",
        "options": ["How we split daily responsibilities", "Whether we still feel understood", "How we handle conflict after years", "Where we each want more independence"],
        "companion_href": "../blog-posts/compatibility-quiz-for-long-term-couples.html",
        "companion_title": "Compatibility Quiz for Long-Term Couples: Check the Connection You Keep Building",
    },
]


# ---------------------------------------------------------------------------
# Helpers (mirrored from daily_polls.py for consistency)
# ---------------------------------------------------------------------------

def js_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace('"', '\\"')


def yaml_value(val):
    if isinstance(val, bool):
        return "true" if val else "false"
    if isinstance(val, int):
        return str(val)
    return '"%s"' % str(val).replace('"', '\\"')


def frontmatter(fields: dict) -> str:
    lines = ["---"]
    for key, val in fields.items():
        if isinstance(val, list):
            if len(val) == 0:
                lines.append(f"{key}: []")
            else:
                lines.append(f"{key}:")
                for item in val:
                    lines.append(f"  - {yaml_value(item)}")
        else:
            lines.append(f"{key}: {yaml_value(val)}")
    lines.append("---")
    return "\n".join(lines)


def load_history() -> dict:
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as fh:
            return json.load(fh)
    return {"published_slugs": [], "next_index": 0}


def save_history(history: dict) -> None:
    with open(HISTORY_FILE, "w", encoding="utf-8") as fh:
        json.dump(history, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


# ---------------------------------------------------------------------------
# Writers
# ---------------------------------------------------------------------------

def _slug_collides(slug: str, existing_ids: set) -> bool:
    """True if this slug would overwrite ANY existing content: a poll page,
    a blog article, or a poll-data.js id. Never reuse another content slot."""
    if slug in existing_ids:
        return True
    if os.path.exists(os.path.join(POLLS_DIR, slug + ".md")):
        return True
    if os.path.exists(os.path.join(BLOG_POSTS_DIR, slug + ".md")):
        return True
    if os.path.exists(os.path.join(BLOG_POSTS_DIR, slug + "-companion.md")):
        return True
    return False


def build_poll_dict(poll_def: dict, date_str: str, existing_ids: set) -> dict:
    slug = poll_def["slug_base"] + "-" + date_str.replace("-", "")
    if _slug_collides(slug, existing_ids):
        for suffix in range(2, 20):
            candidate = "%s-%s-%d" % (poll_def["slug_base"], date_str.replace("-", ""), suffix)
            if not _slug_collides(candidate, existing_ids):
                slug = candidate
                break
        else:
            raise RuntimeError(
                "no free slug available for %s; refusing to overwrite existing content"
                % poll_def["slug_base"])
    topic_label = poll_def["topic"]
    return {
        "id": slug,
        "topic": topic_label.lower().replace(" ", "-"),
        "label": topic_label,
        "title": poll_def["question"],
        "description": poll_def["description"],
        "intro": poll_def["intro"],
        "options": poll_def["options"],
    }


def write_poll_md(poll_dict: dict, poll_def: dict, list_order: int, related_ids: list) -> str:
    slug = poll_dict["id"]
    path = os.path.join(POLLS_DIR, "%s.md" % slug)
    if os.path.exists(path):
        raise RuntimeError(
            "refusing to overwrite existing poll page: %s" % path)
    if related_ids:
        related = [{"href": "%s.html" % related_ids[0], "title": ""}]
    else:
        related = []
    fields = {
        "question": poll_dict["title"],
        "pageTitle": poll_dict["title"],
        "description": poll_dict["description"],
        "intro": poll_dict["intro"],
        "topic": poll_dict["label"],
        "slug": slug,
        "listOrder": list_order,
        "ogImage": OG_IMAGE,
        "ogImageAlt": OG_IMAGE_ALT,
        "companionHref": poll_def["companion_href"],
        "companionTitle": poll_def["companion_title"],
        "options": poll_dict["options"],
        "related": related,
        "draft": False,
    }
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(frontmatter(fields) + "\n")
    return path


def update_poll_data_js(poll_dict: dict, related_ids: list) -> None:
    """Append one entry to the window.COUPLE_POLL_DATA array."""
    with open(POLL_DATA_JS, "r", encoding="utf-8") as fh:
        content = fh.read()
    if re.search(r'id:\s*"%s"' % re.escape(poll_dict["id"]), content):
        raise RuntimeError(
            "refusing to duplicate existing poll-data.js id: %s" % poll_dict["id"])
    related_js = ", ".join('"%s"' % js_escape(r) for r in related_ids)
    entry = ("  {\n"
             "    id: \"%s\",\n"
             "    topic: \"%s\",\n"
             "    label: \"%s\",\n"
             "    title: \"%s\",\n"
             "    description: \"%s\",\n"
             "    intro: \"%s\",\n"
             "    related: [%s],\n"
             "    options: [%s]\n"
             "  }") % (
        js_escape(poll_dict["id"]), js_escape(poll_dict["topic"]),
        js_escape(poll_dict["label"]), js_escape(poll_dict["title"]),
        js_escape(poll_dict["description"]), js_escape(poll_dict["intro"]),
        related_js, opts_js)
    last_bracket = content.rfind("]")
    if last_bracket < 0:
        raise RuntimeError("poll-data.js malformed")
    before = content[:last_bracket].rstrip()
    after = content[last_bracket:]
    if before.endswith("}"):
        before += ",\n"
    new_content = before + entry + "\n" + after
    with open(POLL_DATA_JS, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(new_content)


def update_sitemap(poll_slug: str) -> None:
    if not os.path.exists(SITEMAP_XML):
        return
    with open(SITEMAP_XML, "r", encoding="utf-8") as fh:
        content = fh.read()
    new_url = "%s/polls/%s.html" % (SITE_URL, poll_slug)
    if new_url in content:
        return
    entry = "  <url><loc>%s</loc></url>\n" % new_url
    close = content.rfind("</urlset>")
    if close < 0:
        return
    new_content = content[:close] + entry + content[close:]
    with open(SITEMAP_XML, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(new_content)


def validate_poll_js() -> bool:
    try:
        with open(POLL_DATA_JS, "r", encoding="utf-8") as fh:
            src = fh.read()
        result = subprocess.run(
            ["node", "-e",
             "global.window={};%s;if(!Array.isArray(window.COUPLE_POLL_DATA)){process.exit(1)}" % src],
            capture_output=True, text=True, timeout=20, cwd=REPO_ROOT)
        return result.returncode == 0
    except Exception:
        return True


def git_run(args: list) -> None:
    subprocess.run(["git"] + args, cwd=REPO_ROOT, check=True,
                   capture_output=True, text=True)


def next_orders():
    """Return the next available listOrder value."""
    max_list = 0
    for fn in os.listdir(POLLS_DIR):
        if fn.endswith(".md"):
            path = os.path.join(POLLS_DIR, fn)
            with open(path, "r", encoding="utf-8") as fh:
                for line in fh:
                    m = re.match(r"listOrder:\s*(\d+)", line)
                    if m:
                        max_list = max(max_list, int(m.group(1)))
    return max_list + 1


def existing_poll_ids() -> set:
    """Read poll-data.js and return existing IDs."""
    if not os.path.exists(POLL_DATA_JS):
        return set()
    with open(POLL_DATA_JS, "r", encoding="utf-8") as fh:
        content = fh.read()
    return set(re.findall(r'id:\s*"([^"]+)"', content))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Publish one compatibility poll")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    parser.add_argument("--commit", action="store_true", help="Git commit after writing")
    parser.add_argument("--push", action="store_true", help="Git commit + push")
    parser.add_argument("--date", help="Override date (YYYY-MM-DD)")
    args = parser.parse_args()

    date_str = args.date or dt.date.today().isoformat()
    history = load_history()
    next_idx = history.get("next_index", 0)

    if next_idx >= len(COMPATIBILITY_POLLS):
        print("All 5 compatibility polls already published. Nothing to do.")
        return

    poll_def = COMPATIBILITY_POLLS[next_idx]
    existing = existing_poll_ids()
    published = set(history.get("published_slugs", []))

    related_ids = []
    if next_idx > 0:
        related_ids = [history["published_slugs"][-1]]

    poll_dict = build_poll_dict(poll_def, date_str, existing | published)
    list_order = next_orders()

    print("Publishing poll %d/%d: %s" % (next_idx + 1, len(COMPATIBILITY_POLLS), poll_dict["title"]))
    print("  Slug:      %s" % poll_dict["id"])
    print("  listOrder: %d" % list_order)
    print("  Companion: %s" % poll_def["companion_href"])

    if args.dry_run:
        print("\n[dry-run] No files written.")
        return

    poll_path = write_poll_md(poll_dict, poll_def, list_order, related_ids)
    print("  Wrote poll: %s" % poll_path)

    update_poll_data_js(poll_dict, related_ids)
    print("  Updated:    %s" % POLL_DATA_JS)

    update_sitemap(poll_dict["id"])
    print("  Updated:    %s" % SITEMAP_XML)

    history["published_slugs"].append(poll_dict["id"])
    history["next_index"] = next_idx + 1
    save_history(history)

    if not validate_poll_js():
        print("  WARNING: poll-data.js validation failed. Check manually.")
    else:
        print("  poll-data.js: OK")

    if args.push or args.commit:
        git_run(["add", "public/poll-data.js", "public/sitemap.xml",
                 "src/content/polls/", "scripts/compatibility_poll_history.json"])
        msg = "Publish compatibility poll %d/5: %s" % (next_idx + 1, poll_dict["title"])
        git_run(["commit", "-m", msg])
        print("  Committed:  %s" % msg)
        if args.push:
            git_run(["push"])
            print("  Pushed to origin.")

    remaining = len(COMPATIBILITY_POLLS) - history["next_index"]
    if remaining > 0:
        print("\n%d compatibility poll(s) remaining." % remaining)
    else:
        print("\nAll 5 compatibility polls published!")


if __name__ == "__main__":
    main()


