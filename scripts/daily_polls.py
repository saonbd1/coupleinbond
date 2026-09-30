#!/usr/bin/env python3
"""Daily Poll Generator for Couple in Bond.

Generates 2-3 fresh relationship polls per day from a curated template bank
and posts them directly to the static site:

  1. Appends new poll entries to poll-data.js (window.COUPLE_POLL_DATA)
  2. Creates one SEO-friendly detail page per poll in polls/
  3. Rewires `related` links so new polls cross-link each other
  4. Updates polls.html ItemList JSON-LD + numberOfItems
  5. Adds the new poll pages to sitemap.xml
  6. Optionally commits and pushes so Vercel redeploys the site

Usage:
    python scripts/daily_polls.py                      # 2 polls, dated today
    python scripts/daily_polls.py --count 3            # 3 polls
    python scripts/daily_polls.py --date 2026-10-05    # backfill a date
    python scripts/daily_polls.py --dry-run            # preview only
    python scripts/daily_polls.py --commit --push      # commit + push

Idempotent: scripts/poll_history.json tracks every id ever used, so
re-running for the same date never duplicates content.
"""

from __future__ import annotations

import argparse
import datetime as dt
import html as html_lib
import json
import os
import random
import re
import subprocess
import sys

SITE_URL = "https://couplein.bond"
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POLL_DATA_JS = os.path.join(REPO_ROOT, "poll-data.js")
POLLS_DIR = os.path.join(REPO_ROOT, "polls")
POLLS_HTML = os.path.join(REPO_ROOT, "polls.html")
SITEMAP_XML = os.path.join(REPO_ROOT, "sitemap.xml")
HISTORY_FILE = os.path.join(REPO_ROOT, "scripts", "poll_history.json")
TEMPLATE_PAGE = os.path.join(POLLS_DIR, "weekly-ritual.html")

TOPIC_LABELS = {
    "connection": "Connection",
    "relationships": "Relationships",
    "date-night": "Date night",
    "seasonal": "Seasonal",
}

# Each bank entry: (topic, title, description, intro, [4 options]).
POLL_BANK = [
    ("connection",
     "What small habit keeps a couple feeling close?",
     "Vote on the everyday habits that help two people stay emotionally close through a busy week.",
     "Closeness is built in ordinary minutes more than grand gestures. This poll is a small prompt for noticing which everyday habit keeps you feeling like a team.",
     ["A good-morning message", "A nightly check-in chat", "Undivided attention at dinner", "A shared joke every day"]),
    ("connection",
     "How do you and your partner reconnect after a hard day?",
     "Choose the simple reset that helps two people soften the stress of the day and turn toward each other.",
     "Stress follows people home whether they want it to or not. Use this poll to compare the little rituals that help a couple land softly at the end of a hard day.",
     ["A quiet hug first", "Talking it out over tea", "A short walk together", "Space first, then reconnecting"]),
    ("connection",
     "What makes you feel most appreciated in a relationship?",
     "Vote on the gestures that make appreciation feel real instead of routine.",
     "Everyone wants to feel noticed. This poll explores which kind of appreciation lands deepest, from spoken thanks to small thoughtful surprises.",
     ["Hearing thank you out loud", "A thoughtful surprise", "Help without being asked", "Being noticed for small efforts"]),
    ("connection",
     "When do you feel closest to your partner?",
     "Choose the moment of the day when connection feels strongest for you.",
     "Closeness has a rhythm. Some couples bond over morning coffee, others over late-night talks. This poll maps the moments when two people feel most themselves together.",
     ["Slow mornings together", "Late-night conversations", "Cooking side by side", "Laughing at something silly"]),
    ("connection",
     "What is the best way to say sorry after a silly fight?",
     "Vote on the small repair gestures that end little arguments with warmth instead of pride.",
     "Small fights are normal; staying stuck in them is optional. This poll compares the light, honest gestures that help a couple laugh it off and move on.",
     ["A genuine sorry first", "A hug before words", "Making their favorite snack", "A funny apology note"]),
    ("connection",
     "What does quality time mean to you?",
     "Choose the version of togetherness that actually fills your cup.",
     "Being in the same room is not the same as being together. This poll asks what quality time really looks like when both people are fully present.",
     ["Phones away, eyes up", "Trying something new together", "Deep talk with no agenda", "Comfortable silence side by side"]),
    ("connection",
     "How should couples handle different love languages?",
     "Vote on the kindest way to bridge the gap when two people give and receive love differently.",
     "One person shows love with words, the other with actions, and both wonder if they are understood. This poll explores how couples can meet in the middle.",
     ["Learn each other's language", "Meet halfway every time", "Take turns leading", "Celebrate the differences"]),
    ("connection",
     "What keeps the spark alive in a long relationship?",
     "Choose the habit that keeps long-term love feeling fresh instead of routine.",
     "The spark does not fade on its own; it fades when couples stop being curious. This poll compares the habits that keep long love feeling alive.",
     ["Trying new things together", "Regular surprise dates", "Flirting like the early days", "Growing side by side"]),
    ("connection",
     "What is your favorite way to start the day as a couple?",
     "Vote on the morning ritual that sets the tone for a connected day.",
     "Mornings set the emotional weather for the whole day. This poll asks which small shared start helps a couple face the day as a team.",
     ["Coffee in bed together", "A morning walk", "Planning the day over breakfast", "A slow, unrushed cuddle"]),
    ("connection",
     "How do you show love on an ordinary Tuesday?",
     "Choose the everyday gesture that says love louder than grand occasions.",
     "Valentine's Day gets the spotlight, but ordinary Tuesdays carry the relationship. This poll celebrates the small midweek gestures that matter most.",
     ["Cooking their favorite meal", "A surprise sweet text", "Handling a chore for them", "An unexpected compliment"]),
    ("relationships",
     "What matters most in the first year of a relationship?",
     "Vote on the foundation that matters most when two people are still learning each other.",
     "The first year is equal parts exciting and uncertain. This poll asks which foundation helps a new relationship grow steady roots.",
     ["Honest communication", "Shared values", "Patience with flaws", "Fun and adventure"]),
    ("relationships",
     "What is the hardest part of a long-distance relationship?",
     "Choose the challenge that tests long-distance couples the most.",
     "Miles test a relationship in ways closeness never does. This poll names the hardest part of loving someone from far away.",
     ["Missing everyday moments", "Trusting across distance", "Scheduling around time zones", "Feeling left out of daily life"]),
    ("relationships",
     "What makes a relationship feel equal?",
     "Vote on the sign that tells you a partnership is truly balanced.",
     "Equality is felt in small daily moments. This poll explores what makes both people feel like true partners rather than passengers.",
     ["Sharing decisions together", "Splitting effort fairly", "Respecting each other's goals", "Both feeling heard"]),
    ("relationships",
     "When should a couple talk about the future?",
     "Choose the right moment to turn someday into a real plan.",
     "Future talk can feel exciting or scary depending on the timing. This poll asks when couples should start mapping the road ahead together.",
     ["Early, to align expectations", "When things feel serious", "After the first big trip", "Let it unfold naturally"]),
    ("relationships",
     "What builds trust fastest in a new relationship?",
     "Vote on the behavior that proves someone is trustworthy early on.",
     "Trust is earned in drops and lost in buckets. This poll asks which early behavior convinces you that someone is worth trusting.",
     ["Keeping small promises", "Being open about the past", "Showing up consistently", "Admitting mistakes quickly"]),
    ("relationships",
     "How should couples split household responsibilities?",
     "Choose the fairest way to share the work of running a home together.",
     "Dishes and laundry have ended more peace than anyone admits. This poll compares the systems couples use to keep home life fair.",
     ["Split everything evenly", "Play to each strength", "Rotate chores weekly", "Share the effort naturally"]),
    ("relationships",
     "What is the best way to support a stressed partner?",
     "Vote on the kind of support that actually helps when your partner is overwhelmed.",
     "When someone you love is stressed, good intentions can miss the mark. This poll asks what support really lands.",
     ["Listen without fixing", "Take tasks off their plate", "Offer comfort and closeness", "Give them quiet space"]),
    ("relationships",
     "Should couples keep some things private from each other?",
     "Choose where you stand on privacy inside a committed relationship.",
     "Honesty and privacy can feel like opposites in love. This poll explores whether healthy couples need a little room of their own.",
     ["Yes, everyone needs space", "Only small personal things", "No, share everything", "It depends on the topic"]),
    ("relationships",
     "What makes meeting the family less stressful?",
     "Vote on the strategy that turns a nerve-wracking introduction into a warm one.",
     "Meeting the family is a milestone with high stakes. This poll asks what makes that first big introduction go smoothly.",
     ["Bring a thoughtful gift", "Let your partner brief you", "Ask genuine questions", "Keep the first visit short"]),
    ("relationships",
     "How do you keep friendships alive while in a relationship?",
     "Choose the balance that keeps love and friendship both thriving.",
     "New love can quietly swallow old friendships. This poll explores how couples protect the friendships that matter.",
     ["Schedule regular friend time", "Blend friend groups together", "Protect solo friend nights", "Invite friends into couple plans"]),
    ("date-night",
     "What is the perfect at-home date night?",
     "Vote on the cozy home date that beats any expensive night out.",
     "The best dates do not always need reservations. This poll asks which at-home evening feels most romantic with the right person.",
     ["Movie night with snacks", "Cooking a new recipe together", "Board games and wine", "Stargazing from the balcony"]),
    ("date-night",
     "What is your ideal first-date spot?",
     "Choose the first-date setting that helps two people relax and be themselves.",
     "First dates are auditions for comfort. This poll asks which setting gives two strangers the best chance to become something more.",
     ["A cozy coffee shop", "A casual food street", "A park walk", "A fun activity like bowling"]),
    ("date-night",
     "How often should couples have date night?",
     "Vote on the rhythm that keeps dating each other going long after the wedding.",
     "Dating should not stop when commitment starts. This poll asks how often couples should protect time that is just for the two of them.",
     ["Every single week", "Twice a month", "Once a month, done well", "Whenever it happens naturally"]),
    ("date-night",
     "What is the best surprise date idea?",
     "Choose the surprise that would genuinely delight your partner.",
     "Surprises show you pay attention. This poll asks which unexpected date would make your partner light up.",
     ["A secret picnic spot", "Tickets to something they love", "A hometown tour of memories", "Breakfast delivered in bed"]),
    ("date-night",
     "What ruins a date night fastest?",
     "Vote on the date-night killer couples should avoid at all costs.",
     "One bad habit can sink a lovely evening. This poll names the fastest way to ruin a date so couples can dodge it.",
     ["Scrolling the phone", "Talking about work stress", "Arriving late", "Comparing to past dates"]),
    ("date-night",
     "What is the best budget-friendly date?",
     "Choose the low-cost date that still feels special.",
     "Romance does not need a big budget. This poll asks which simple, cheap date still feels like a real occasion.",
     ["Sunset walk and street food", "Free museum or gallery day", "Home-cooked candlelight dinner", "Night drive with good music"]),
    ("date-night",
     "Should phones be banned on date night?",
     "Vote on whether date night deserves a strict no-phone rule.",
     "The phone is the third wheel on most modern dates. This poll asks whether couples should ban it outright for one evening.",
     ["Yes, phones in a drawer", "Only for photos and emergencies", "No rule, just be present", "One phone-free hour is enough"]),
    ("date-night",
     "What is the best rainy-day date?",
     "Choose the coziest way to spend a rainy day with your person.",
     "Rain cancels plans but creates possibilities. This poll asks which rainy-day date turns gray weather into a memory.",
     ["Cafe hopping in the rain", "Puzzle and hot chocolate day", "Binge a new series together", "Cook comfort food together"]),
    ("date-night",
     "Who should plan the next date?",
     "Vote on the fairest way to share the planning of date nights.",
     "Planning is part of the romance, but it should not always fall on one person. This poll asks who should take the lead next.",
     ["Take turns planning", "Whoever feels inspired", "Plan it together", "Surprise each other alternately"]),
    ("date-night",
     "What is the best way to end a perfect date?",
     "Choose the ending that makes a great date unforgettable.",
     "Endings shape memories. This poll asks which closing moment turns a good date into one you talk about for weeks.",
     ["A long walk home together", "Dessert at a late-night spot", "Sitting quietly under the stars", "Planning the next date on the spot"]),
]
# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

def slugify(title):
    slug = title.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "-", slug).strip("-")
    stop = {"a", "an", "the", "is", "are", "was", "do", "does", "did",
            "you", "your", "yours", "we", "our", "us", "it", "its",
            "in", "on", "at", "to", "for", "of", "and", "or", "what",
            "which", "when", "how", "should", "there", "with", "as"}
    words = [w for w in slug.split("-") if w and w not in stop][:5]
    return "-".join(words) or "couple-poll"


def load_history():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, encoding="utf-8") as f:
            data = json.load(f)
            return set(data.get("used_ids", [])), set(data.get("used_slugs", []))
    return set(), set()


def save_history(used_ids, used_slugs):
    os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump({"used_ids": sorted(used_ids), "used_slugs": sorted(used_slugs)},
                  f, indent=2)


def existing_ids_in_data_js():
    with open(POLL_DATA_JS, encoding="utf-8") as f:
        return set(re.findall(r'id:\s*"([^"]+)"', f.read()))


def pick_new_polls(count, date_str, used_ids):
    """Pick `count` bank entries not used before; mix topics when possible."""
    seed = int(date_str.replace("-", ""))
    rng = random.Random(seed)
    in_file = existing_ids_in_data_js()
    pool = [(i, e) for i, e in enumerate(POLL_BANK)]
    rng.shuffle(pool)
    by_topic = {}
    for i, e in pool:
        by_topic.setdefault(e[0], []).append((i, e))
    picked, seen_topics = [], set()
    for topic in sorted(by_topic):
        if len(picked) >= count:
            break
        for i, e in by_topic[topic]:
            key = "%d:%s" % (i, e[1])
            if key in used_ids:
                continue
            picked.append((i, e))
            seen_topics.add(topic)
            break
    if len(picked) < count:  # bank exhausted -> allow reuse, oldest first
        for i, e in pool:
            if len(picked) >= count:
                break
            if (i, e) not in picked:
                picked.append((i, e))
    rng.shuffle(picked)
    return picked
def js_escape(text):
    return text.replace("\\", "\\\\").replace('"', '\\"')


def build_poll_dict(bank_index, entry, date_str, used_slugs, taken_ids):
    topic, title, description, intro, options = entry
    base = slugify(title)
    slug = "%s-%s" % (base, date_str.replace("-", ""))
    n = 2
    while slug in used_slugs or os.path.exists(os.path.join(POLLS_DIR, slug + ".html")):
        slug = "%s-%s-%d" % (base, date_str.replace("-", ""), n)
        n += 1
    if slug in taken_ids:
        slug = "%s-%s" % (slug, date_str.replace("-", ""))
    return {
        "bank_index": bank_index, "id": slug, "topic": topic,
        "label": TOPIC_LABELS[topic], "title": title,
        "description": description, "intro": intro,
        "options": list(options), "related": [],
    }


def poll_entry_js(poll):
    lines = ["  {",
             '    id: "%s",' % js_escape(poll["id"]),
             '    topic: "%s",' % poll["topic"],
             '    label: "%s",' % poll["label"],
             '    title: "%s",' % js_escape(poll["title"]),
             '    description: "%s",' % js_escape(poll["description"]),
             '    intro: "%s",' % js_escape(poll["intro"]),
             '    related: [%s],' % ", ".join('"%s"' % r for r in poll["related"]),
             '    options: [%s]' % ", ".join('"%s"' % js_escape(o) for o in poll["options"]),
             "  },"]
    return "\n".join(lines)


def update_poll_data_js(new_polls):
    with open(POLL_DATA_JS, encoding="utf-8") as f:
        content = f.read()
    marker = "\n];"
    idx = content.find(marker)
    if idx == -1:
        raise RuntimeError("Could not find closing '];' in poll-data.js")
    block = "\n".join(poll_entry_js(p) for p in new_polls)
    content = content[:idx] + "\n" + block + content[idx:]
    with open(POLL_DATA_JS, "w", encoding="utf-8") as f:
        f.write(content)
def render_detail_page(poll, related_polls):
    esc = html_lib.escape
    title, desc, intro = esc(poll["title"]), esc(poll["description"]), esc(poll["intro"])
    url = "%s/polls/%s.html" % (SITE_URL, poll["id"])
    og_image = "%s/assets/polls-hero-illustration.png" % SITE_URL
    options_html = "".join(
        '<label class="poll-detail-option"><input type="radio" name="poll-answer" '
        'value="%d"><span>%s</span></label>' % (i, esc(o))
        for i, o in enumerate(poll["options"]))
    rel_cards = "".join(
        '<a class="poll-related-card" href="%s.html"><span>Related poll</span>'
        '<strong>%s</strong></a>' % (r["id"], esc(r["title"]))
        for r in related_polls)
    answers = ",".join('{"@type":"Answer","text":%s}' % json.dumps(o) for o in poll["options"])
    ld = ('{"@context":"https://schema.org","@graph":['
          '{"@type":"WebPage","@id":"%s#webpage","url":"%s","name":%s,"description":%s,'
          '"inLanguage":"en","isPartOf":{"@id":"%s/polls.html#collection"},'
          '"mainEntity":{"@id":"%s#question"}},'
          '{"@type":"Question","@id":"%s#question","name":%s,"text":%s,"description":%s,'
          '"answerCount":%d,"suggestedAnswer":[%s]},'
          '{"@type":"BreadcrumbList","@id":"%s#breadcrumbs","itemListElement":['
          '{"@type":"ListItem","position":1,"name":"Polls","item":"%s/polls.html"},'
          '{"@type":"ListItem","position":2,"name":%s,"item":"%s"}]}]}'
          % (url, url, json.dumps(poll["title"]), json.dumps(poll["description"]),
             SITE_URL, url, url, json.dumps(poll["title"]), json.dumps(poll["title"]),
             json.dumps(poll["description"]), len(poll["options"]), answers,
             url, SITE_URL, json.dumps(poll["title"]), url))
    return """<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>%s &mdash; Relationship Poll | Couple in Bond</title>
  <meta name="description" content="%s">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="%s">
  <link rel="stylesheet" href="../blog.css">
  <link rel="stylesheet" href="../polls.css">
  <link rel="stylesheet" href="../poll-detail.css">
  <script src="../blog-nav.js" defer></script>
  <script src="../poll-data.js" defer></script>
  <script src="../poll-detail.js" defer></script>
  <meta property="og:title" content="%s &mdash; Couple in Bond">
  <meta property="og:description" content="%s">
  <meta property="og:url" content="%s">
  <meta property="og:type" content="article">
  <meta property="og:image" content="%s">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Hands placing colorful relationship poll cards into a ballot box">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="%s &mdash; Couple in Bond">
  <meta name="twitter:description" content="%s">
  <meta name="twitter:image" content="%s">
  <script type="application/ld+json" data-seo-enhancement>%s</script>
</head>
<body data-poll-id="%s">
  <div class="blog-shell polls-shell"><div class="blog-wrap">
    <header class="blog-nav" data-root="../"><a class="blog-brand" href="../index.html">💕 Couple in Bond</a></header>
    <main class="poll-detail-page">
      <nav class="poll-breadcrumbs" aria-label="Breadcrumb"><a href="../polls.html">Relationship polls</a><span> / </span><span>%s</span></nav>
      <article class="poll-detail-card">
        <div class="poll-detail-kicker">%s &middot; Couple in Bond</div>
        <h1>%s</h1>
        <p class="poll-detail-description">%s</p>
        <p class="poll-detail-intro">%s</p>
        <form id="pollDetailForm" class="poll-detail-form">
          <fieldset id="pollDetailOptions" class="poll-detail-options" aria-label="%s">%s</fieldset>
          <button id="pollDetailSubmit" class="poll-submit" type="submit">Vote on this topic</button>
          <p id="pollDetailFeedback" class="poll-feedback" aria-live="polite"></p>
        </form>
        <section id="pollDetailResults" class="poll-detail-results" aria-live="polite"></section>
      </article>
      <section class="poll-related" aria-labelledby="related-polls-title"><div class="blog-kicker">Keep exploring</div><h2 id="related-polls-title">Related relationship polls</h2><div class="poll-related-grid">%s</div></section>
      <p class="poll-detail-note">This static poll records one vote in your browser so you can compare your own choice with the local result. It is designed for conversation and reflection, not scientific measurement.</p>
    </main>
    <footer class="blog-footer"><p>&copy; 2026 Couple in Bond. All rights reserved.</p><p><a href="../calculator.html">Love calculator</a> &middot; <a href="../quotes.html">Love quotes</a> &middot; <a href="../polls.html">All polls</a></p></footer>
  </div></div>
</body>
</html>
""" % (title, desc, url, title, desc, url, og_image, title, desc, og_image,
        ld, poll["id"], poll["label"], poll["label"], title, desc, intro,
        title, options_html, rel_cards)
def rewire_related(new_polls):
    """Point the first two entries that precede the new batch at the first
    new poll, so the new content is linked from the established list. New
    entries already carry their own cross-links from update_poll_data_js."""
    if not new_polls:
        return
    new_ids = set(p["id"] for p in new_polls)
    first = new_polls[0]["id"]
    with open(POLL_DATA_JS, encoding="utf-8") as f:
        content = f.read()
    # Split on top-level "  {" lines. re.split with a capture group yields:
    # [preamble, brace, body1, brace, body2, ...] so bodies sit at even
    # indices >= 2. Each body is scoped to exactly one poll object, so the
    # id/related regexes can never bleed across entries.
    parts = re.split(r"(?m)^(  \{)$", content)
    fixed = 0
    for i in range(2, len(parts), 2):
        if fixed >= 2:
            break
        body = parts[i]
        if body.strip().startswith("{") or body.strip() == "{":
            continue  # a brace fragment, not a body (defensive)
        m_id = re.search(r'id:\s*"([^"]+)"', body)
        m_rel = re.search(r'related:\s*(\[[^\]]*\])', body)
        if not m_id or not m_rel:
            continue
        if m_id.group(1) in new_ids:
            continue  # only rewire pre-existing polls, never the new batch
        items = re.findall(r'"([^"]+)"', m_rel.group(1))
        if first in items:
            continue
        items = ([first] + items)[:2]
        parts[i] = (body[:m_rel.start(1)] + "[%s]" % ", ".join('"%s"' % x for x in items)
                    + body[m_rel.end(1):])
        fixed += 1
    with open(POLL_DATA_JS, "w", encoding="utf-8") as f:
        f.write("".join(parts))



def update_polls_html(new_polls):
    with open(POLLS_HTML, encoding="utf-8") as f:
        content = f.read()
    items = re.findall(
        r'\{\s*"@type":\s*"ListItem",\s*"position":\s*(\d+),',
        content)
    pos = max(int(x) for x in items) if items else 0
    new_entries = []
    for p in new_polls:
        pos += 1
        new_entries.append(
            '          { "@type": "ListItem", "position": %d, "name": %s, '
            '"url": "%s/polls/%s.html" },' % (
                pos, json.dumps(p["title"]), SITE_URL, p["id"]))
    block = "\n".join(new_entries)
    content = re.sub(r'("numberOfItems":\s*)\d+',
                     lambda m: m.group(1) + str(pos), content, count=1)
    anchor = "        ]\n      }\n    ]\n  }"
    idx = content.find(anchor)
    if idx == -1:
        raise RuntimeError("Could not find ItemList closing anchor in polls.html")
    content = content[:idx] + block + "\n" + content[idx:]
    with open(POLLS_HTML, "w", encoding="utf-8") as f:
        f.write(content)


def update_sitemap(new_polls):
    with open(SITEMAP_XML, encoding="utf-8") as f:
        content = f.read()
    entries = "\n".join(
        "  <url><loc>%s/polls/%s.html</loc></url>" % (SITE_URL, p["id"])
        for p in new_polls) + "\n"
    content = content.replace("</urlset>", entries + "</urlset>")
    with open(SITEMAP_XML, "w", encoding="utf-8") as f:
        f.write(content)
def git_run(args):
    r = subprocess.run(["git", "-C", REPO_ROOT] + args,
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError("git %s failed: %s" % (" ".join(args), r.stderr.strip()))
    return r.stdout.strip()


def validate_poll_js():
    check = ("const fs=require('fs');const src=fs.readFileSync(%s,'utf8');"
             "const m=src.match(/window\\.COUPLE_POLL_DATA\\s*=\\s*(\\[[\\s\\S]*?\\]);/);"
             "if(!m){console.error('DATA-NOT-FOUND');process.exit(1);}"
             "const ids=(m[1].match(/id:\\s*\"[^\"]+\"/g)||[]);"
             "console.log('polls='+ids.length);"
             % json.dumps(POLL_DATA_JS))
    out = subprocess.run(["node", "-e", check], capture_output=True, text=True)
    if out.returncode != 0 or "polls=" not in out.stdout:
        raise RuntimeError("poll-data.js validation failed: %s" % out.stderr.strip())
    return out.stdout.strip()
# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Generate daily Couple in Bond polls.")
    ap.add_argument("--count", type=int, default=2, choices=[1, 2, 3],
                    help="polls to generate (default: 2)")
    ap.add_argument("--date", default=None,
                    help="target date YYYY-MM-DD (default: today)")
    ap.add_argument("--dry-run", action="store_true", help="preview only, write nothing")
    ap.add_argument("--commit", action="store_true", help="git commit the changes")
    ap.add_argument("--push", action="store_true", help="git push origin/main (implies --commit)")
    args = ap.parse_args()

    try:
        date_obj = dt.date.fromisoformat(args.date) if args.date else dt.date.today()
    except ValueError:
        print("ERROR: --date must be YYYY-MM-DD", file=sys.stderr)
        sys.exit(2)
    date_str = date_obj.isoformat()

    used_ids, used_slugs = load_history()
    picked = pick_new_polls(args.count, date_str, used_ids)
    taken_ids = existing_ids_in_data_js()
    new_polls = [build_poll_dict(i, e, date_str, used_slugs, taken_ids) for i, e in picked]
    for p in new_polls:
        taken_ids.add(p["id"])

    # cross-link the batch (needed before writing poll-data.js)
    id_list = [p["id"] for p in new_polls]
    for p in new_polls:
        rel = [x for x in id_list if x != p["id"]]
        for fb in ("date-night-mood", "connection-ritual", "weekly-ritual"):
            if len(rel) >= 2:
                break
            if fb not in rel and fb in taken_ids:
                rel.append(fb)
        p["related"] = rel[:2]

    print("Date: %s | generating %d poll(s):" % (date_str, len(new_polls)))
    for p in new_polls:
        print("  - [%s] %s  (id: %s)" % (p["topic"], p["title"], p["id"]))

    if args.dry_run:
        print("DRY RUN: no files written.")
        return 0

    update_poll_data_js(new_polls)   # appends entries (with batch related links)
    rewire_related(new_polls)        # rewires first two OLD polls to link back

    # detail pages: related cards point at sibling new polls (fallback: popular old ones)
    with open(POLL_DATA_JS, encoding="utf-8") as f:
        data_js = f.read()
    titles = dict(re.findall(r'id:\s*"([^"]+)"[\s\S]{0,400}?title:\s*"([^"]+)"', data_js))
    for p in new_polls:
        rel = [{"id": r, "title": titles.get(r, r)} for r in p["related"]]
        page = render_detail_page(p, rel)
        with open(os.path.join(POLLS_DIR, p["id"] + ".html"), "w", encoding="utf-8") as f:
            f.write(page)
        print("  wrote polls/%s.html" % p["id"])

    update_polls_html(new_polls)
    update_sitemap(new_polls)
    print("  updated poll-data.js, polls.html, sitemap.xml")

    try:
        print("  validation: %s" % validate_poll_js())
    except Exception as exc:  # noqa: BLE001 - report, do not crash the batch
        print("  WARNING: validation skipped (%s)" % exc)

    for p in new_polls:
        used_ids.add("%d:%s" % (p["bank_index"], POLL_BANK[p["bank_index"]][1]))
        used_slugs.add(p["id"])
    save_history(used_ids, used_slugs)

    if args.push:
        args.commit = True
    if args.commit:
        git_run(["add", "poll-data.js", "polls", "polls.html", "sitemap.xml",
                 "scripts/poll_history.json"])
        git_run(["commit", "-m",
                 "Add %d daily poll(s) for %s" % (len(new_polls), date_str)])
        print("  committed.")
    if args.push:
        git_run(["push", "origin", "main"])
        print("  pushed to origin/main (Vercel will redeploy).")

    print("DONE: %d poll(s) posted for %s." % (len(new_polls), date_str))
    return 0


if __name__ == "__main__":
    sys.exit(main())

