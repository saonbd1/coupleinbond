#!/usr/bin/env python3
"""Daily Poll Generator for Couple in Bond.

Generates a fresh relationship poll from a curated template bank and posts it
directly to the Astro site:

  1. Appends new poll entries to poll-data.js (window.COUPLE_POLL_DATA)
  2. Creates src/content/polls/<id>.md (PollDetail.astro renders the page)
  3. Creates src/content/blog/<id>-companion.md (BlogPost.astro renders it)
  4. Rewires `related` links so new polls cross-link each other
  5. Adds the new pages to sitemap.xml
  6. Optionally commits and pushes so Vercel redeploys the site

No index patching is needed: src/pages/blog.astro and src/pages/polls.astro
regenerate their card grids and ItemList JSON-LD from the content collections,
ordered by the cardOrder/ldOrder/listOrder frontmatter this script extends.

Usage:
    python scripts/daily_polls.py                      # 1 poll, dated today
    python scripts/daily_polls.py --count 2            # 2 polls
    python scripts/daily_polls.py --date 2026-10-05    # backfill a date
    python scripts/daily_polls.py --dry-run            # preview only
    python scripts/daily_polls.py --commit --push      # commit + push

Idempotent: scripts/poll_history.json tracks every id ever used, so
re-running for the same date never duplicates content.

Cadence: the bank below holds a fixed number of entries, so publishing is
deliberately slow (Mon/Wed/Fri, one poll per run -- see
.github/workflows/daily-polls.yml). When the unused entries run out the
script exits non-zero rather than republishing one, because a repeated bank
entry emits a byte-identical companion article at a second URL.
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
# The poll client data (poll-data.js) and the sitemap still live under
# public/ (Astro copies it verbatim into dist/). Poll and companion PAGES
# are content collections now: src/pages/polls/[slug].astro and
# src/pages/blog-posts/[slug].astro render them from frontmatter, so the
# generator writes markdown under src/content/, not HTML under public/.
PUBLIC_DIR = os.path.join(REPO_ROOT, "public")
POLL_DATA_JS = os.path.join(PUBLIC_DIR, "poll-data.js")
SITEMAP_XML = os.path.join(PUBLIC_DIR, "sitemap.xml")
HISTORY_FILE = os.path.join(REPO_ROOT, "scripts", "poll_history.json")
POLLS_DIR = os.path.join(REPO_ROOT, "src", "content", "polls")
BLOG_POSTS_DIR = os.path.join(REPO_ROOT, "src", "content", "blog")

TOPIC_LABELS = {
    "connection": "Connection",
    "relationships": "Relationships",
    "date-night": "Date night",
    "seasonal": "Seasonal",
}

# Each bank entry: (topic, title, description, intro, options[4],
#   article_title, article_dek, article_h2a, article_h2a_body,
#   article_callout, article_h2b, article_h2b_items[4-6],
#   article_h2c, article_h2c_body).
# The article_* fields drive the 400-500 word companion blog post
# (blog-write skill format: answer-first + Key Takeaways + callout).
POLL_BANK = [
    ("connection",
     "What small habit keeps a couple feeling close?",
     "Vote on the everyday habits that help two people stay emotionally close through a busy week.",
     "Closeness is built in ordinary minutes more than grand gestures. This poll is a small prompt for noticing which everyday habit keeps you feeling like a team.",
     ["A good-morning message", "A nightly check-in chat", "Undivided attention at dinner", "A shared joke every day"],
     "Small Habits That Keep Couples Feeling Close",
     "Grand gestures get remembered, but small habits get repeated. Here is how ordinary minutes keep two people feeling like a team.",
     "Why small habits beat grand gestures",
     "A big surprise happens a few times a year, but a small habit happens every single day. That repetition is what the nervous system reads as safety. When your partner texts good morning without fail, or puts the phone away at dinner without being asked, your brain files it as proof that you matter. Over weeks and months, those tiny deposits grow into a feeling of closeness no single date night can manufacture. The poll above asks which habit matters most to you, and every option works for the same reason: it is small enough to repeat and warm enough to notice.",
     "A gentle rule: pick one habit, not five. A single ritual you both enjoy will outlast a long list you both forget.",
     "Four habits worth trying this week",
     ["Send a good-morning message before checking the news",
      "Ask one real question at dinner and actually listen to the answer",
      "End the day with a two-minute check-in: one heavy moment, one light one",
      "Share one small joke or meme that says you were thinking of them"],
     "Make it yours",
     "The best habit is the one you will both repeat without resentment. Try one option from the poll for seven days and notice how the evenings feel. If it fits, keep it. If it does not, trade it for another. Closeness grows through repetition, not performance, so start small and let the ritual earn its place in your week."),
# __BANK2__
    ("connection",
     "How do you and your partner reconnect after a hard day?",
     "Choose the simple reset that helps two people soften the stress of the day and turn toward each other.",
     "Stress follows people home whether they want it to or not. Use this poll to compare the little rituals that help a couple land softly at the end of a hard day.",
     ["A quiet hug first", "Talking it out over tea", "A short walk together", "Space first, then reconnecting"],
     "How Couples Reconnect After a Hard Day",
     "Stress comes home with you unless you leave it at the door on purpose. Here are gentle ways to land softly together at the end of a hard day.",
     "Decompress first, debrief second",
     "The first twenty minutes after work shape the whole evening. Stress is still high, patience is still low, and one sharp tone can set the mood for hours. That is why the order matters: comfort before conversation. A hug, a glass of water, a change of clothes, and only then the question of how the day went. Couples who build a small landing ritual argue less about nothing, because they stop mistaking exhaustion for attitude. Vote in the poll below for the reset that works in your home, then protect it like an appointment.",
     "A gentle rule: greet the person before the problem. Ten calm minutes together beats an hour of venting apart.",
     "Four landing rituals that work",
     ["A quiet hug at the door before any talk about the day",
      "A short walk around the block to shake off the commute",
      "Tea or a snack together while phones stay in another room",
      "Thirty minutes of solo space, then a real check-in"],
     "Make it yours",
     "Ask your partner which version of you they meet in the evening, tired or tender, and design the ritual around the honest answer. The goal is not a perfect evening. It is two people choosing, night after night, to turn toward each other instead of away."),
    ("connection",
     "What makes you feel most appreciated in a relationship?",
     "Vote on the gestures that make appreciation feel real instead of routine.",
     "Everyone wants to feel noticed. This poll explores which kind of appreciation lands deepest, from spoken thanks to small thoughtful surprises.",
     ["Hearing thank you out loud", "A thoughtful surprise", "Help without being asked", "Being noticed for small efforts"],
     "What Makes Appreciation Feel Real in a Relationship",
     "Everyone wants to feel noticed, but not every thank-you lands the same way. Here is what turns routine gratitude into something your partner actually feels.",
     "Specific beats generic every time",
     "Thanks for everything is easy to say and easy to forget. Thanks for handling dinner when I was stuck late, with the kitchen already clean, is impossible to fake and impossible to forget. Specificity proves you were paying attention, and attention is the real gift inside appreciation. That is why the poll options all share one trait: they describe a moment, not a mood. Pick the version your partner lights up for, then practice saying the quiet part out loud. Being noticed for small efforts is what most couples vote for, because small efforts are where love actually lives.",
     "A gentle rule: name the action, not just the feeling. What your partner did matters more than how nice they are.",
     "Four ways to show it this week",
     ["Say thank you for one specific thing every day",
      "Do a chore they dislike without being asked or praised",
      "Leave a short note where only they will find it",
      "Praise them to someone else while they can hear you"],
     "Make it yours",
     "Notice which appreciation your partner repeats back to you, because people echo what moved them. Double down on that one. Feeling appreciated is not about grand speeches. It is about one person proving, daily, that the other is seen."),
    ("connection",
     "When do you feel closest to your partner?",
     "Choose the moment of the day when connection feels strongest for you.",
     "Closeness has a rhythm. Some couples bond over morning coffee, others over late-night talks. This poll maps the moments when two people feel most themselves together.",
     ["Slow mornings together", "Late-night conversations", "Cooking side by side", "Laughing at something silly"],
     "When Do Couples Feel Closest During the Day",
     "Closeness has a rhythm, and every couple dances to a different beat. Here is how to find the hour when you two feel most like yourselves together.",
     "Find your hour, then protect it",
     "Ask ten couples when they feel closest and you will get ten different answers. Morning people bond over coffee before the world wakes up. Night owls bond over whispered conversations when the house is finally quiet. Cooks bond shoulder to shoulder over a shared cutting board. The pattern is not the hour itself. It is the absence of performance: no guests, no screens, no agenda. The poll below asks when that hour falls for you. Whatever wins, treat it as sacred. Even fifteen guarded minutes a day will do more for a relationship than a whole distracted weekend.",
     "A gentle rule: closeness needs a container. Same time, same place, no phones, and the feeling will start arriving on schedule.",
     "Four ways to guard your hour",
     ["Name it out loud so you both know it exists",
      "Put phones in another room before it starts",
      "Keep it short enough to repeat daily",
      "Let it be boring sometimes; routine is the point"],
     "Make it yours",
     "Try each poll option for three days and compare notes on Sunday. The hour that leaves you both lighter is your answer. Then defend it gently but firmly, because the couples who feel closest are usually just the couples who kept one small appointment with each other."),
    ("connection",
     "What is the best way to say sorry after a silly fight?",
     "Vote on the small repair gestures that end little arguments with warmth instead of pride.",
     "Small fights are normal; staying stuck in them is optional. This poll compares the light, honest gestures that help a couple laugh it off and move on.",
     ["A genuine sorry first", "A hug before words", "Making their favorite snack", "A funny apology note"],
     "How to Say Sorry After a Silly Fight",
     "Small fights are normal; staying stuck in them is optional. Here is how to end a silly argument with warmth instead of pride.",
     "Repair fast, repair warm",
     "Relationship researchers found that how a couple ends a disagreement predicts happiness far better than how often they disagree. Silly fights are actually good practice for the serious ones. The skill is the same: drop the scoreboard, name your part, and offer one warm gesture before pride hardens into a position. A genuine sorry first costs nothing and buys everything. The poll below lists the repairs couples swear by. Pick yours, then use it fast, because the first hour after a silly fight is when warmth is cheapest and matters most.",
     "A gentle rule: apologize for your part, not their reaction. I snapped beats you made me snap, every time.",
     "Four repairs that end silly fights",
     ["Say the plain words first: I was wrong about that",
      "Offer a hug before rehashing who said what",
      "Make their favorite snack as a peace offering",
      "Write a two-line funny apology note and leave it on their pillow"],
     "Make it yours",
     "Agree on a silly-fight ritual while you are happy, not while you are annoyed. A code word, a hug rule, a snack protocol. Then both of you can reach for it when pride is loud. The couples who laugh about fights later are the ones who repaired them warmly at the time."),
    ("connection",
     "What does quality time mean to you?",
     "Choose the version of togetherness that actually fills your cup.",
     "Being in the same room is not the same as being together. This poll asks what quality time really looks like when both people are fully present.",
     ["Phones away, eyes up", "Trying something new together", "Deep talk with no agenda", "Comfortable silence side by side"],
     "What Quality Time Really Means for Couples",
     "Being in the same room is not the same as being together. Here is what quality time looks like when both people are fully present.",
     "Presence is the whole gift",
     "You can spend an entire evening beside someone and still feel alone, if one of you is scrolling and the other is waiting to be noticed. Quality time is not measured in hours. It is measured in attention. The poll below asks which version of togetherness fills your cup, and every answer is really the same answer in disguise: I want to feel like the most interesting thing in the room to you. Start there and the format almost does not matter. A silent drive with full attention beats a fancy dinner with half attention.",
     "A gentle rule: one screen-free hour together beats three distracted hours apart in the same house.",
     "Four kinds of togetherness to try",
     ["Phones in a drawer, eyes up, for one full hour",
      "One new thing a month: a class, a trail, a recipe",
      "A deep-talk walk with one rule: no fixing, just listening",
      "Comfortable silence on purpose: reading side by side, touching"],
     "Make it yours",
     "Vote in the poll, then schedule the winner like it is a doctor's appointment. Quality time that lives only in good intentions never happens. Quality time with a time slot and a phone drawer becomes the part of the week you both look forward to."),
    ("connection",
     "How should couples handle different love languages?",
     "Vote on the kindest way to bridge the gap when two people give and receive love differently.",
     "One person shows love with words, the other with actions, and both wonder if they are understood. This poll explores how couples can meet in the middle.",
     ["Learn each other's language", "Meet halfway every time", "Take turns leading", "Celebrate the differences"],
     "How Couples Bridge Different Love Languages",
     "One person shows love with words, the other with actions, and both wonder if they are understood. Here is how to meet in the middle.",
     "Translation matters more than effort",
     "You can love someone enormously in a language they do not speak and still leave them feeling unloved. The words-of-affirmation partner writes paragraphs; the acts-of-service partner fixes the sink. Both are saying I love you. Neither is hearing it. The fix is not more effort in your own language. It is a little effort in theirs. Learn the five love languages together, name yours out loud, and then practice the one that feels unnatural. That awkward practice is the most convincing love letter there is. Vote below for the bridge style that fits you two.",
     "A gentle rule: love them in their language on ordinary days, and in yours on special ones.",
     "Four bridges worth building",
     ["Take the love-languages quiz together and compare results",
      "Ask directly: what did I do lately that made you feel loved",
      "Practice one unnatural gesture a week in their language",
      "Thank each other for translated love, even when it lands clumsily"],
     "Make it yours",
     "Different languages are not a flaw in the relationship. They are the relationship: two distinct people choosing to understand each other anyway. The couples who celebrate the difference instead of fighting it end up fluent in two loves instead of one."),
    ("connection",
     "What keeps the spark alive in a long relationship?",
     "Choose the habit that keeps long-term love feeling fresh instead of routine.",
     "The spark does not fade on its own; it fades when couples stop being curious. This poll compares the habits that keep long love feeling alive.",
     ["Trying new things together", "Regular surprise dates", "Flirting like the early days", "Growing side by side"],
     "How to Keep the Spark Alive in a Long Relationship",
     "The spark does not fade on its own; it fades when couples stop being curious. Here are habits that keep long love feeling alive.",
     "Curiosity is the real spark",
     "People blame time for a fading spark, but the culprit is usually familiarity without curiosity. You know exactly what your partner will order, say, and do, so you stop asking. The early-days electricity came from discovery, and discovery is renewable. Try the restaurant neither of you can pronounce. Ask the question you assume you know the answer to. Flirt with the history you share instead of mourning the mystery you lost. Vote below for the habit that fits you, then do the smallest version of it this week. Sparks do not need grand gestures. They need new information about a familiar person.",
     "A gentle rule: novelty together beats novelty alone. New experiences bond; separate routines drift.",
     "Four spark habits that work",
     ["One new shared experience a month, however small",
      "A surprise date with no occasion and no big budget",
      "Deliberate flirting: compliments, notes, lingering looks",
      "A shared project with a future: a trip fund, a garden, a skill"],
     "Make it yours",
     "Long love has an advantage new love lacks: a deep well of shared meaning to draw from. Use it. Remind each other of the early story, then write the next chapter on purpose. The spark was never about newness. It was about attention, and attention is always available."),
    ("connection",
     "What is your favorite way to start the day as a couple?",
     "Vote on the morning ritual that sets the tone for a connected day.",
     "Mornings set the emotional weather for the whole day. This poll asks which small shared start helps a couple face the day as a team.",
     ["Coffee in bed together", "A morning walk", "Planning the day over breakfast", "A slow, unrushed cuddle"],
     "The Couple Morning Ritual That Starts the Day Right",
     "Mornings set the emotional weather for the whole day. Here is the small shared start that helps a couple face everything as a team.",
     "First minutes set the forecast",
     "The way you greet each other in the morning quietly programs the day. Rushed goodbyes and glowing screens forecast disconnection. A shared coffee, a short walk, or even five unrushed minutes of contact forecast teamwork. It is not about the activity. It is about the message: you are my first priority, before the inbox and the noise. The poll below lists the rituals couples love most. None takes more than twenty minutes. All of them beat starting the day as two strangers sharing a bathroom.",
     "A gentle rule: touch before tech. One hug before the first scroll changes the whole morning.",
     "Four mornings worth waking up for",
     ["Coffee in bed with no phones for the first ten minutes",
      "A short walk together before the day speeds up",
      "Breakfast with one plan and one gratitude each",
      "A slow cuddle with nowhere to be for five minutes"],
     "Make it yours",
     "Pick the ritual that fits your chronotype, not your aspirations. Night owls should not promise sunrise runs. Choose the gentlest version you will both repeat, then repeat it until it feels strange to skip. Mornings become the anchor the rest of the day hangs from."),
    ("connection",
     "How do you show love on an ordinary Tuesday?",
     "Choose the everyday gesture that says love louder than grand occasions.",
     "Valentine's Day gets the spotlight, but ordinary Tuesdays carry the relationship. This poll celebrates the small midweek gestures that matter most.",
     ["Cooking their favorite meal", "A surprise sweet text", "Handling a chore for them", "An unexpected compliment"],
     "How to Show Love on an Ordinary Day",
     "Valentine's Day gets the spotlight, but ordinary days carry the relationship. Here is how small midweek gestures say love the loudest.",
     "Tuesdays carry more weight than Valentine's",
     "One romantic holiday cannot compensate for fifty-two indifferent weeks. What partners actually tally is the ordinary-day evidence: who noticed, who helped, who bothered. A surprise text on a random Tuesday lands harder than a dozen roses on the expected day, because it proves love is a habit, not a performance. The poll below lists the everyday gestures couples rate highest. They share two traits: they cost almost nothing, and they prove attention. Vote for yours, then do it this Tuesday, not someday.",
     "A gentle rule: unexpected beats expensive. Surprise multiplies every gesture.",
     "Four Tuesday gestures that work",
     ["Cook their favorite meal on a night with no occasion",
      "Send a midday text naming one thing you admire about them",
      "Silently handle the chore they always dread",
      "Give a specific compliment about something they chose"],
     "Make it yours",
     "The magic word is ordinary. Pick the smallest gesture you can repeat weekly without strain, then repeat it until your partner starts expecting it fondly. That expectation, met again and again, is what being loved feels like from the inside."),
    ("relationships",
     "What matters most in the first year of a relationship?",
     "Vote on the foundation that matters most when two people are still learning each other.",
     "The first year is equal parts exciting and uncertain. This poll asks which foundation helps a new relationship grow steady roots.",
     ["Honest communication", "Shared values", "Patience with flaws", "Fun and adventure"],
     "What Matters Most in the First Year Together",
     "The first year is equal parts exciting and uncertain. Here is the foundation that helps a new relationship grow steady roots.",
     "Build the foundation before the furniture",
     "New couples love decorating the relationship: trips, photos, milestones. But the structure underneath matters more than anything displayed on top. Honest communication lets you survive the first real disagreement. Shared values keep small choices from becoming big fights. Patience with flaws turns quirks from red flags into love stories. And fun keeps the whole project worth doing. The poll below asks which foundation you would build first. There is no wrong answer, but there is a wrong order: decoration before structure always cracks later.",
     "A gentle rule: say the uncomfortable thing early and kindly. Small honesty now prevents big resentment later.",
     "Four foundations to lay in year one",
     ["Practice honest communication about needs, not just feelings",
      "Name your non-negotiable values out loud before they collide",
      "Give flaws a generous interpretation while they are still small",
      "Protect fun deliberately: one adventure a month, minimum"],
     "Make it yours",
     "Vote in the poll, then ask your partner the same question over dinner. Comparing answers in the first year is itself the foundation. Couples who build the habit of honest, kind conversation early rarely need rescue later."),
    ("relationships",
     "What is the hardest part of a long-distance relationship?",
     "Choose the challenge that tests long-distance couples the most.",
     "Miles test a relationship in ways closeness never does. This poll names the hardest part of loving someone from far away.",
     ["Missing everyday moments", "Trusting across distance", "Scheduling around time zones", "Feeling left out of daily life"],
     "How to Survive the Hardest Part of Long Distance",
     "Miles test a relationship in ways closeness never does. Here is how to handle the part of long distance that hurts most.",
     "Name the ache, then shrink it",
     "Long distance hurts in a specific place for each couple. For some it is the missing: no shared breakfasts, no hand to hold in traffic. For others it is the trusting: silence that feels heavier across time zones. Naming your exact ache is the first relief, because vague loneliness is harder to soothe than a specific one. The poll below lists the four classic hard parts. Whichever wins for you, the antidote is the same shape: a small daily ritual that proves the other person is still there. A good-night voice note. A shared photo of something ordinary. Presence, compressed and sent daily.",
     "A gentle rule: never go to sleep angry across time zones. Resolve it or schedule it, but do not let miles add silence to hurt.",
     "Four rituals that shrink the miles",
     ["A daily window that belongs only to you two, however short",
      "One shared ordinary thing per day: a meal photo, a song, a sky",
      "A countdown you can both see: visits, calls, the reunion date",
      "Radical transparency about schedules so silence never reads as absence"],
     "Make it yours",
     "Vote in the poll and tell your partner which option stings most for you. Then build one ritual aimed exactly at that ache. Long-distance couples who survive are not the ones who feel less. They are the ones who built better bridges for the feeling."),
    ("relationships",
     "What makes a relationship feel equal?",
     "Vote on the sign that tells you a partnership is truly balanced.",
     "Equality is felt in small daily moments. This poll explores what makes both people feel like true partners rather than passengers.",
     ["Sharing decisions together", "Splitting effort fairly", "Respecting each other's goals", "Both feeling heard"],
     "What Makes a Relationship Feel Truly Equal",
     "Equality is felt in small daily moments. Here is what makes both people feel like true partners rather than passengers.",
     "Equality is a daily feeling, not a contract",
     "No couple ever signed a fairness agreement and felt equal forever. Equality is renegotiated in tiny moments: whose turn, whose dream, whose exhaustion counts today. The poll below lists the four signs partners notice most. Sharing decisions means both voices shape the outcome, not just the louder one. Splitting effort fairly means the mental load counts too, not just the visible chores. Respecting goals means her promotion matters as much as his. And feeling heard is the master sign: when both people regularly think she gets me, the partnership feels equal no matter the spreadsheet.",
     "A gentle rule: audit the invisible work. Planning, remembering, and worrying are labor too.",
     "Four equality checks for this week",
     ["List every recurring task, visible and invisible, then rebalance",
      "Ask: when did you last feel overruled, and fix that pattern",
      "Give each person's goals equal calendar space this month",
      "End disagreements by repeating back what you heard before replying"],
     "Make it yours",
     "Vote in the poll, then trade answers with your partner over an honest evening. The gap between your two votes is the actual work. Equality is not a destination couples reach. It is a conversation they keep having, kindly, for as long as they choose each other."),
    ("relationships",
     "When should a couple talk about the future?",
     "Choose the right moment to turn someday into a real plan.",
     "Future talk can feel exciting or scary depending on the timing. This poll asks when couples should start mapping the road ahead together.",
     ["Early, to align expectations", "When things feel serious", "After the first big trip", "Let it unfold naturally"],
     "When Should Couples Start Talking About the Future",
     "Future talk can feel exciting or scary depending on the timing. Here is how to turn someday into a real plan without pressure.",
     "Early light, not early lock-in",
     "The mistake is not talking about the future. The mistake is treating early talk as a contract instead of a compass. Light, honest signals in the first months, I want kids someday, I need to live near my family, prevent years of misaligned investment. The poll below asks when to start, and every good answer shares a principle: signal early, decide late. Share direction before you demand destination. A first big trip is a popular milestone because travel reveals values under mild stress. But the best time is whenever curiosity feels stronger than fear.",
     "A gentle rule: share dreams before demanding plans. Direction first, destination later.",
     "Four future conversations in order",
     ["Values first: what does a good life look like to each of you",
      "Non-negotiables next: kids, location, career, faith",
      "Timelines after that: rough seasons, not hard deadlines",
      "Money throughout: habits and fears, spoken without shame"],
     "Make it yours",
     "Vote in the poll, then open the lightest version of the talk this week. Frame it as curiosity, not negotiation. Couples who map the road early do not kill romance. They protect it from the slow heartbreak of discovering, years in, that they were driving different directions."),
    ("relationships",
     "What builds trust fastest in a new relationship?",
     "Vote on the behavior that proves someone is trustworthy early on.",
     "Trust is earned in drops and lost in buckets. This poll asks which early behavior convinces you that someone is worth trusting.",
     ["Keeping small promises", "Being open about the past", "Showing up consistently", "Admitting mistakes quickly"],
     "What Builds Trust Fastest in a New Relationship",
     "Trust is earned in drops and lost in buckets. Here is the early behavior that proves someone is worth trusting.",
     "Small promises are the trust laboratory",
     "Nobody decides to trust a partner after one grand speech. Trust is a pattern your brain detects across dozens of tiny tests. Did they text when they said they would. Did the small promise survive an inconvenient day. The poll below lists the behaviors that pass those tests fastest, and keeping small promises wins for a reason: it is verifiable, repeatable, and hard to fake. Consistency is the whole game early on. Show up on time, admit the small mistake fast, and stay open about the past without trauma-dumping. Each kept micro-promise whispers this person is safe.",
     "A gentle rule: under-promise and over-deliver. Reliability in small things predicts honesty in big ones.",
     "Four trust builders for new couples",
     ["Keep every small promise for thirty days straight",
      "Share one honest story from your past each week",
      "Show up on time, every time, especially when it is inconvenient",
      "Admit mistakes within the hour, before being asked"],
     "Make it yours",
     "Vote in the poll and tell your new partner which behavior convinces you. Then practice it visibly. Trust does not grow from reassurance. It grows from evidence, and the fastest evidence is a long streak of small things done exactly as promised."),
    ("relationships",
     "How should couples split household responsibilities?",
     "Choose the fairest way to share the work of running a home together.",
     "Dishes and laundry have ended more peace than anyone admits. This poll compares the systems couples use to keep home life fair.",
     ["Split everything evenly", "Play to each strength", "Rotate chores weekly", "Share the effort naturally"],
     "How Couples Should Split Household Work Fairly",
     "Dishes and laundry have ended more peace than anyone admits. Here is the system that keeps home life fair without scorekeeping.",
     "Fair is a feeling, not a formula",
     "Couples fight about chores because the real grievance is rarely the dishes. It is the feeling of being unseen while carrying invisible weight: noticing, planning, remembering. That is why splitting everything evenly often fails. It counts visible tasks and ignores mental load. The poll below lists the systems couples use, and the winners share a trait: they make the invisible visible first. List everything, including who remembers birthdays and who notices the milk is low. Then divide by energy and preference, not just by half. Fairness you can both see ends the argument before it starts.",
     "A gentle rule: whoever cares less about how it is done should do it the other's way cheerfully, or trade the task.",
     "Four systems that end chore fights",
     ["Write down every task, then claim by preference, not by default",
      "Play to strengths: detail lovers plan, energy types execute",
      "Rotate the hated jobs weekly so resentment never compounds",
      "Do a ten-minute nightly reset together instead of weekend marathons"],
     "Make it yours",
     "Vote in the poll, then hold a calm chore summit with snacks, not during a fight. Revisit monthly, because fairness drifts as life changes. The couples who never fight about chores are not luckier. They just made the system visible before the resentment did."),
    ("relationships",
     "What is the best way to support a stressed partner?",
     "Vote on the kind of support that actually helps when your partner is overwhelmed.",
     "When someone you love is stressed, good intentions can miss the mark. This poll asks what support really lands.",
     ["Listen without fixing", "Take tasks off their plate", "Offer comfort and closeness", "Give them quiet space"],
     "How to Support a Stressed Partner the Right Way",
     "When someone you love is stressed, good intentions can miss the mark. Here is the support that actually lands.",
     "Ask, do not assume",
     "The biggest support mistake is giving what you would want instead of what they need. Fixers offer solutions to a partner who needed a hug. Huggers offer closeness to a partner who needed an hour alone. The poll below lists the four support styles, and each one is exactly right for somebody and exactly wrong for somebody else. So ask the magic question: do you want comfort or solutions right now. Then honor the answer without commentary. Partners who feel supported are not the ones with the most helpful partner. They are the ones with the most listening one.",
     "A gentle rule: comfort first, solutions only on request. Fixing uninvited feels like criticism.",
     "Four supports that actually help",
     ["Listen fully without fixing: reflect, do not redirect",
      "Quietly remove one task from their plate today",
      "Offer physical comfort with no strings or agenda",
      "Grant real quiet space, then check back warmly"],
     "Make it yours",
     "Vote in the poll, then ask your partner to rank the four options for their worst days. Write the ranking on the fridge. Next time stress hits, you will not have to guess. Support that matches the moment feels like love. Support that misses it feels like pressure."),
    ("relationships",
     "Should couples keep some things private from each other?",
     "Choose where you stand on privacy inside a committed relationship.",
     "Honesty and privacy can feel like opposites in love. This poll explores whether healthy couples need a little room of their own.",
     ["Yes, everyone needs space", "Only small personal things", "No, share everything", "It depends on the topic"],
     "Should Couples Keep Some Things Private",
     "Honesty and privacy can feel like opposites in love. Here is where healthy couples draw the line between secrecy and space.",
     "Privacy is not secrecy",
     "The confusion causes most privacy fights. Secrecy hides something that affects your partner: debts, messages, plans that change shared life. Privacy simply keeps something personal: a journal, a friendship vent, the gift you are planning. Healthy couples share everything that touches the partnership and allow space for everything that does not. The poll below shows where people land, and most land in the middle: yes to space, no to secrets. If you would change the behavior upon being seen, it is secrecy. If being seen would merely feel exposing, it is privacy.",
     "A gentle rule: share what affects them, keep what restores you. Secrets corrode; solitude renews.",
     "Four lines healthy couples draw",
     ["Finances, health, and plans that affect both: always shared",
      "Past stories: shared at your pace, not on demand",
      "Friend vents and journals: private unless they ask for help",
      "Surprises and gifts: happily secret until revealed"],
     "Make it yours",
     "Vote in the poll, then each write down one thing you keep private and why. Trade papers over tea. Most couples discover the gap is smaller than feared. Privacy with transparency about the boundary itself feels like trust. Privacy discovered by accident feels like betrayal."),
    ("relationships",
     "What makes meeting the family less stressful?",
     "Vote on the strategy that turns a nerve-wracking introduction into a warm one.",
     "Meeting the family is a milestone with high stakes. This poll asks what makes that first big introduction go smoothly.",
     ["Bring a thoughtful gift", "Let your partner brief you", "Ask genuine questions", "Keep the first visit short"],
     "How to Make Meeting the Family Go Smoothly",
     "Meeting the family is a milestone with high stakes. Here is what turns a nerve-wracking introduction into a warm one.",
     "Be interested, not impressive",
     "The instinct is to perform: dress sharper, talk smarter, bring the grandest gift. But families bond with interest, not impressiveness. The poll below lists what actually works, and asking genuine questions wins because it gives them the gift everyone wants: feeling fascinating to someone new. Let your partner brief you on names, stories, and landmines beforehand. Bring something thoughtful but modest. Keep the first visit short enough to leave them wanting more. And remember the real audience is one person watching you charm their people, which charms them most of all.",
     "A gentle rule: learn three names and one story per person before you arrive. Remembered details beat rehearsed charm.",
     "Four moves for a warm first visit",
     ["Ask your partner for a briefing: names, stories, topics to avoid",
      "Bring a modest thoughtful gift, ideally something shareable",
      "Ask genuine questions and listen longer than feels natural",
      "Keep it short: leave while the warmth is still rising"],
     "Make it yours",
     "Vote in the poll, then debrief together on the ride home: what landed, what surprised you. Meeting the family is a team sport, and the debrief is where you become teammates. Do it well and the second visit starts with hugs instead of handshakes."),
    ("relationships",
     "How do you keep friendships alive while in a relationship?",
     "Choose the balance that keeps love and friendship both thriving.",
     "New love can quietly swallow old friendships. This poll explores how couples protect the friendships that matter.",
     ["Schedule regular friend time", "Blend friend groups together", "Protect solo friend nights", "Invite friends into couple plans"],
     "How to Keep Friendships Alive in a Relationship",
     "New love can quietly swallow old friendships. Here is how couples protect the friendships that matter without neglecting each other.",
     "Friendship needs a calendar slot",
     "Nobody plans to lose friends to a relationship. It happens by drift: one skipped dinner becomes a skipped season, and suddenly the friend group has new inside jokes you do not get. The poll below lists the balances that work, and every one is really the same move: make friendship scheduled instead of spontaneous. Spontaneous friend time loses to couple comfort every single time. Scheduled friend time survives. Protect a recurring night, blend circles occasionally so worlds do not split, and let your partner have their own nights without guilt or surveillance.",
     "A gentle rule: friendships die from drift, not decisions. A recurring date defends them.",
     "Four friendship guards that work",
     ["One protected friend night each, every week or two",
      "A monthly blended plan so circles overlap warmly",
      "No guilt and no check-ins during solo friend time",
      "A shared calendar where friend plans are real appointments"],
     "Make it yours",
     "Vote in the poll and compare with your partner tonight. Then text one friend you have been meaning to see and set the date. Couples with thriving friendships fight less, because less pressure lands on one person to be everything. Love grows best with witnesses."),
    ("date-night",
     "What is the perfect at-home date night?",
     "Vote on the cozy home date that beats any expensive night out.",
     "The best dates do not always need reservations. This poll asks which at-home evening feels most romantic with the right person.",
     ["Movie night with snacks", "Cooking a new recipe together", "Board games and wine", "Stargazing from the balcony"],
     "The Perfect At-Home Date Night Guide",
     "The best dates do not always need reservations. Here is the cozy home evening that beats any expensive night out.",
     "Home is the most underrated venue",
     "Restaurants charge for atmosphere you can create free with dimmed lights, a shared blanket, and phones in another room. The poll below lists the home dates couples love most, and each wins for a different reason. Movie nights work through shared emotion. Cooking works through teamwork. Board games work through playful rivalry. Stargazing works through wonder. Pick the one that matches tonight's energy, not the one that photographs best. The couples who date best at home are not the ones with the biggest living rooms. They are the ones who treat an ordinary evening like an occasion.",
     "A gentle rule: plan it like a real date. Set a time, dress slightly up, and phones stay parked.",
     "Four home dates worth repeating",
     ["Movie night with a theme: snacks matched to the film",
      "Cook a new recipe together with music and no rushing",
      "Board games with playful stakes: loser makes dessert",
      "Balcony stargazing with blankets and one big question each"],
     "Make it yours",
     "Vote in the poll, then schedule the winner for this week like a reservation you cannot cancel. Home dates compound: the tenth one feels more intimate than the first, because the ritual itself becomes the romance."),
    ("date-night",
     "What is your ideal first-date spot?",
     "Choose the first-date setting that helps two people relax and be themselves.",
     "First dates are auditions for comfort. This poll asks which setting gives two strangers the best chance to become something more.",
     ["A cozy coffee shop", "A casual food street", "A park walk", "A fun activity like bowling"],
     "Where to Go on a Great First Date",
     "First dates are auditions for comfort. Here is the setting that gives two strangers the best chance to become something more.",
     "Comfort beats impressiveness",
     "The classic first-date mistake is optimizing for wow instead of ease. Fancy restaurants create pressure: fixed seats, forced eye contact, silence that echoes. The poll below lists settings couples actually recommend, and they share a formula: movement plus low stakes. Coffee shops allow easy exits. Food streets give you things to react to together. Park walks let silence feel natural. Activities like bowling turn nerves into laughter. Vote for your favorite, then remember the venue is only ten percent. The other ninety is whether both people can relax enough to be themselves.",
     "A gentle rule: pick somewhere with an easy exit and something to look at besides each other.",
     "Four first-date settings that work",
     ["A cozy coffee shop in daylight: cheap, warm, escapable",
      "A food street or market: built-in conversation topics",
      "A park walk: movement dissolves awkwardness",
      "A playful activity: bowling, mini-golf, or arcade games"],
     "Make it yours",
     "Vote in the poll, then plan the date around conversation, not performance. Arrive early, put the phone away, and ask the second question, not just the first. Great first dates are not remembered for the place. They are remembered for the feeling of being at ease with someone new."),
    ("date-night",
     "How often should couples have date night?",
     "Vote on the rhythm that keeps dating each other going long after the wedding.",
     "Dating should not stop when commitment starts. This poll asks how often couples should protect time that is just for the two of them.",
     ["Every single week", "Twice a month", "Once a month, done well", "Whenever it happens naturally"],
     "How Often Should Couples Have Date Night",
     "Dating should not stop when commitment starts. Here is the rhythm that keeps two people dating each other for decades.",
     "Rhythm beats spontaneity",
     "Waiting for the mood to strike means waiting forever, because busy seasons never end on their own. The poll below asks how often couples should protect time for two, and the honest answer is: as often as you can repeat without strain. Weekly works for couples with simple logistics. Twice a month fits packed calendars. Once a month, done beautifully, beats three distracted outings. What fails is whenever it happens naturally, because natural means never when life is full. Put the date on the calendar first and let logistics orbit it, not the reverse.",
     "A gentle rule: schedule the next date before the current one ends. Momentum protects romance.",
     "Four rhythms that keep dating alive",
     ["Weekly micro-dates: coffee, walks, twenty focused minutes",
      "Twice-monthly evenings out with phones parked",
      "Monthly occasion dates planned with real intention",
      "A yearly getaway that gives the small dates a horizon"],
     "Make it yours",
     "Vote in the poll, then open the calendar together tonight and book the next three. Couples who date weekly are not less busy. They just decided the relationship gets first pick of the calendar instead of leftovers."),
    ("date-night",
     "What is the best surprise date idea?",
     "Choose the surprise that would genuinely delight your partner.",
     "Surprises show you pay attention. This poll asks which unexpected date would make your partner light up.",
     ["A secret picnic spot", "Tickets to something they love", "A hometown tour of memories", "Breakfast delivered in bed"],
     "Surprise Date Ideas Your Partner Will Love",
     "Surprises show you pay attention. Here is the unexpected date that will make your partner light up.",
     "Attention is the real surprise",
     "The surprise itself matters less than what it proves: I notice you when you are not performing. A secret picnic at the spot they mentioned once works because it says I listened. Tickets to the thing they love work because they say I know you. The poll below lists the surprises couples rate highest, and each one is personalized proof of attention. Generic surprises impress for an hour. Personal ones get retold for years. Vote for your style, then add one detail only your partner would recognize. That detail is the whole gift.",
     "A gentle rule: the best surprise references something they said, not something you bought.",
     "Four surprises worth planning",
     ["A secret picnic at a spot they mentioned weeks ago",
      "Tickets to the artist, team, or show they never stop talking about",
      "A tour of your shared memories: first meeting spot, first meal",
      "Breakfast in bed on a day with no occasion at all"],
     "Make it yours",
     "Vote in the poll, then keep a running note on your phone: things they mention loving. When surprise season comes, you will not be guessing. The partners who surprise best are not the most creative. They are the most observant."),
    ("date-night",
     "What ruins a date night fastest?",
     "Vote on the date-night killer couples should avoid at all costs.",
     "One bad habit can sink a lovely evening. This poll names the fastest way to ruin a date so couples can dodge it.",
     ["Scrolling the phone", "Talking about work stress", "Arriving late", "Comparing to past dates"],
     "What Ruins a Date Night and How to Avoid It",
     "One bad habit can sink a lovely evening. Here is the fastest way to ruin a date, and the simple fix for each.",
     "Presence is the date",
     "A date is not a venue or a menu. It is two people choosing each other over everything else for a few hours. Everything on the poll's ruin list breaks that choice in a different way. Scrolling says something else is more interesting. Work talk drags the office into the romance. Lateness says your time matters more. Comparing to past dates says you are grading, not enjoying. The fixes are gloriously simple: park the phone, ban work for the evening, leave ten minutes early, and let this date be its own story. Vote for your pet peeve, then kill it in your own behavior first.",
     "A gentle rule: the phone test never lies. Whoever reaches for it first names what matters most.",
     "Four fixes for the four killers",
     ["Phones in a drawer from hello to goodnight, photos excepted",
      "A work-talk quarantine: fifteen minutes max, then romance only",
      "Arrive early with a small plan so waiting feels like care",
      "A past-dates amnesty: this evening gets judged on its own"],
     "Make it yours",
     "Vote in the poll and confess your own worst habit to your partner with humor. Then agree on one shared rule for the next date. Couples who protect the date protect the feeling, and the feeling is the whole point of going out together."),
    ("date-night",
     "What is the best budget-friendly date?",
     "Choose the low-cost date that still feels special.",
     "Romance does not need a big budget. This poll asks which simple, cheap date still feels like a real occasion.",
     ["Sunset walk and street food", "Free museum or gallery day", "Home-cooked candlelight dinner", "Night drive with good music"],
     "Best Budget Dates That Still Feel Special",
     "Romance does not need a big budget. Here is the simple, cheap date that still feels like a real occasion.",
     "Intention outperforms expense",
     "Ask couples about their favorite date ever and the answer is rarely the priciest. It is the one where someone tried: the planned route, the homemade dessert, the playlist for the drive. Money buys convenience, but intention buys meaning, and meaning is what gets remembered. The poll below lists budget dates couples genuinely love. Each costs little and signals much: I planned this for you. Vote for your favorite, then execute it with full ceremony. Candlelight costs nothing. Attention costs nothing. Those are the whole luxury.",
     "A gentle rule: spend planning, not money. An hour of thought beats a hundred dollars of default.",
     "Four budget dates that feel rich",
     ["Sunset walk plus street food: golden hour does the decorating",
      "Free museum or gallery day with coffee after to debate favorites",
      "Home-cooked candlelight dinner with phones parked and music on",
      "Night drive with a playlist built for exactly this person"],
     "Make it yours",
     "Vote in the poll, then set a monthly budget-date challenge: who plans the better ten-dollar evening. Couples who date richly on little build something money cannot buy: proof that the relationship, not the spending, is the occasion."),
    ("date-night",
     "Should phones be banned on date night?",
     "Vote on whether date night deserves a strict no-phone rule.",
     "The phone is the third wheel on most modern dates. This poll asks whether couples should ban it outright for one evening.",
     ["Yes, phones in a drawer", "Only for photos and emergencies", "No rule, just be present", "One phone-free hour is enough"],
     "Should Couples Ban Phones on Date Night",
     "The phone is the third wheel on most modern dates. Here is whether date night deserves a strict no-phone rule, and what works instead.",
     "The phone is the other person at the table",
     "Every glance at a screen is a micro-rejection: this notification outranks you right now. Nobody means it that way, but brains keep score anyway. Studies keep finding the same thing: the mere presence of a face-down phone lowers conversation quality. The poll below asks how strict the rule should be, from full drawer lockdown to gentle intentions. The couples who thrive pick a clear rule, not a vibe. One phone-free hour with full attention beats three hours of half-presence. Vote for your boundary, then enforce it on yourself first. Rules you model beat rules you announce.",
     "A gentle rule: whoever touches their phone first does the dishes. Playful stakes beat lectures.",
     "Four phone rules that actually stick",
     ["Full drawer mode: phones parked from hello to goodnight",
      "Camera-only exception: photos welcome, scrolling banned",
      "First-hour lockdown: total presence, then relaxed evening",
      "Stack-and-penalty game: first to peek pays for dessert"],
     "Make it yours",
     "Vote in the poll and agree on one rule before the next date, not during it. Then watch what happens to the conversation when the third wheel leaves the table. Most couples report the same shock: we talked like we used to. The phones did not add anything. Their absence did."),
    ("date-night",
     "What is the best rainy-day date?",
     "Choose the coziest way to spend a rainy day with your person.",
     "Rain cancels plans but creates possibilities. This poll asks which rainy-day date turns gray weather into a memory.",
     ["Cafe hopping in the rain", "Puzzle and hot chocolate day", "Binge a new series together", "Cook comfort food together"],
     "Cozy Rainy-Day Date Ideas for Couples",
     "Rain cancels plans but creates possibilities. Here is the rainy-day date that turns gray weather into a memory.",
     "Bad weather is a feature, not a bug",
     "Rain gives couples permission to slow down without guilt. No errands, no social pressure, just a shared roof and nowhere to be. The poll below lists the rainy-day dates couples love most. Cafe hopping turns the city into a cozy tour. Puzzles and hot chocolate turn the living room into a cabin. A shared series becomes your private world for a day. Cooking comfort food fills the house with smells you will associate with each other for years. Vote for your mood, then lean all the way in. The couples who love rainy days are not luckier with weather. They just stopped fighting it.",
     "A gentle rule: match the day's energy instead of fighting it. Slow weather, slow date.",
     "Four rainy days worth remembering",
     ["Cafe hopping: three cafes, one shared dessert at each",
      "A thousand-piece puzzle with hot chocolate and no phones",
      "A full-season binge with themed snacks per episode",
      "Cook the coziest meal you know, slowly, together"],
     "Make it yours",
     "Vote in the poll, then build a rainy-day box: candles, a puzzle, cocoa, a saved film list. Next storm becomes an occasion instead of a cancellation. Years from now you will not remember the sunny errands. You will remember the gray day you stayed in and chose each other."),
    ("date-night",
     "Who should plan the next date?",
     "Vote on the fairest way to share the planning of date nights.",
     "Planning is part of the romance, but it should not always fall on one person. This poll asks who should take the lead next.",
     ["Take turns planning", "Whoever feels inspired", "Plan it together", "Surprise each other alternately"],
     "Who Should Plan Date Night in a Relationship",
     "Planning is part of the romance, but it should not always fall on one person. Here is the fairest way to share it.",
     "Planning is invisible labor too",
     "Someone finds the restaurant, checks the hours, books the table, and remembers the anniversary of the first one. That someone is usually the same person every time, and the effort is invisible right up until resentment makes it visible. The poll below lists the fair ways couples share planning. Taking turns is simplest and most equal. Planning together suits couples who enjoy the anticipation as part of the date. Alternating surprises keeps delight alive while sharing load. Whatever you pick, name it out loud. Unspoken planning defaults are how one partner becomes the relationship's unpaid event manager.",
     "A gentle rule: the planner gets pampered on the date. Effort earns appreciation, not just attendance.",
     "Four planning systems that share the load",
     ["Strict alternation: your month, my month, no exceptions",
      "Inspiration rule: whoever feels the spark plans, guilt-free",
      "Joint planning dates: a monthly coffee to design the next month",
      "Surprise rotation: alternate who delights whom"],
     "Make it yours",
     "Vote in the poll, then ask who planned the last three dates and answer honestly. If the same name comes up thrice, rebalance this week. Shared planning does more than split work. It proves the relationship is something you build together, not something one of you performs for the other."),
    ("date-night",
     "What is the best way to end a perfect date?",
     "Choose the ending that makes a great date unforgettable.",
     "Endings shape memories. This poll asks which closing moment turns a good date into one you talk about for weeks.",
     ["A long walk home together", "Dessert at a late-night spot", "Sitting quietly under the stars", "Planning the next date on the spot"],
     "How to End a Perfect Date Night",
     "Endings shape memories. Here is the closing moment that turns a good date into one you talk about for weeks.",
     "End slow to remember more",
     "Psychologists found that people judge experiences by their peak and their ending, not their average. A lovely dinner followed by a rushed goodbye gets remembered as rushed. The same dinner followed by a slow walk home gets remembered as magic. The poll below lists the endings couples love most, and each one stretches the evening's warmth a little longer. Dessert adds a second act. Stargazing adds wonder. Planning the next date on the spot adds anticipation. Vote for your favorite ending, then protect the last thirty minutes like the date depends on it. It does.",
     "A gentle rule: never end a good date in a hurry. The last thirty minutes write the memory.",
     "Four endings worth lingering for",
     ["A long walk home with no destination and no rush",
      "Dessert somewhere late-night and a little indulgent",
      "Ten quiet minutes under the sky, phones away",
      "Planning the next date together before saying goodnight"],
     "Make it yours",
     "Vote in the poll, then try the winner after your next date night. Notice how the whole evening feels different in memory the next morning. Great dates are not just lived well. They are ended well, on purpose, together."),
    # --- v3 additions: the bank below was empty for `seasonal` and had no
    # unused entries left in `connection` or `date-night`. Written to the same
    # 14-field shape as the rest of the bank.
    ("seasonal",
     "What matters most on an anniversary?",
     "Vote on the part of an anniversary that makes the date feel worth marking at all.",
     "Anniversaries quietly ask for a verdict on the year just passed. This poll asks what makes the day feel meaningful instead of obligatory.",
     ["Repeating the first date", "A letter and no plan at all", "A trip put aside for months", "An ordinary day, made deliberate"],
     "How to Mark an Anniversary Without Turning It Into a Test",
     "Anniversaries land when they say something specific about the two of you. Here is how to decide what you are saying before you book anything.",
     "Why anniversaries carry more weight than birthdays",
     "A birthday asks nothing about the relationship. An anniversary asks for a verdict, which is why couples handle it so badly. Some overinvest and turn one evening into proof that the whole year worked. Some underinvest and let the date pass with a text, as though acknowledging it would make the number real. Both reactions come from the same assumption: that the day has to carry meaning rather than receive it. An anniversary means whatever you decide it means. If the year was hard, a quiet evening that says we are still here can land harder than a weekend away. If the year was easy, marking it is how you keep the ease from being mistaken for indifference. The options in the poll above are not ranked by cost. They are ranked by how much of the relationship each one requires you to name out loud, and that naming is the part most couples skip.",
     "One honest test: the plan should be impossible to send to somebody else by mistake.",
     "Four anniversary formats and what each one says",
     ["Repeating the first date: says the story still matters more than the upgrade",
      "A letter and no plan: says the thing never said out loud finally got said",
      "A trip saved for months: says the relationship beat the spending",
      "An ordinary day made deliberate: says closeness does not need a stage"],
     "Match the gesture to the year you actually had",
     "Look back at the last twelve months before you book anything. A year of small friction calls for relief rather than spectacle: an evening with no logistics, no queue at a restaurant, no performance. A year of distance calls for something with a beginning and an end, a shared event you can both refer back to. A year that simply flew by calls for the cheapest thing available, which is attention. Whatever you choose, say why you chose it. An anniversary plan explained in one sentence lands better than an expensive one left unexplained."),
    ("seasonal",
     "How should couples handle the holiday season together?",
     "Vote on the plan that keeps the holidays a shared season rather than a source of arguments.",
     "The holidays ask couples to negotiate family, money, and exhaustion inside the same fortnight. This poll compares the ways through.",
     ["Alternate families year by year", "Split each day down the middle", "Host our own small thing", "Keep the season deliberately quiet"],
     "How Couples Get Through the Holiday Season Without Turning on Each Other",
     "Holiday friction is rarely about the holidays. It is about two plans, two families, and far too little notice. Here is how to sort it early.",
     "Most holiday arguments are scheduling arguments wearing a costume",
     "Nobody fights about the turkey. They fight because the plan changed on the fourth, because one person was consulted and the other was informed, and because the drive to a relative's house was agreed in September and remembered in December. Holiday tension is almost always a logistics problem that arrived too late to fix quietly. That is why the four options in the poll above work: each one removes a decision from the week in which it has to be executed. Alternating by year settles the largest question well in advance. Splitting a day settles it daily. Hosting your own thing replaces an obligation with a plan you chose. Keeping the season small is the honest answer for couples already running on empty, and it is more common than anybody admits out loud at a family dinner.",
     "A fair rule: the plan is agreed by the first of December, and any change after that costs whoever proposes it something.",
     "Four conversations to have before the season starts",
     ["Which relatives, in which order, and for how many hours",
      "What each of you is willing to spend, said out loud rather than assumed",
      "Which traditions you are keeping and which you are quietly dropping",
      "What counts as a break, and whether either of you may take one alone"],
     "Protect the season, not just the day",
     "The mistake is treating the holidays as one long celebration. For most couples they are a fortnight of obligations with two genuinely good evenings inside them. Book those two evenings first, the ones where nothing is expected of you, and let the rest be logistics. Couples who schedule rest during December stop mistaking their own exhaustion for dissatisfaction with each other, and that single substitution prevents more holiday damage than any gesture."),
    ("seasonal",
     "What is the best gift a couple can give each other?",
     "Vote on the kinds of present that actually land in a long relationship.",
     "Most couples are bad at gifts and good at loving each other. This poll looks at what turns attention into something a partner can hold.",
     ["Something they mentioned weeks ago", "A day planned entirely around them", "A chore removed from their list", "An experience booked for later"],
     "What Makes a Gift Land in a Long Relationship",
     "Expensive is not the same as noticed. Here is why the best presents prove you were paying attention long before the occasion arrived.",
     "Attention is the only thing a gift can prove",
     "A gift is a receipt for attention, which is why an expensive object chosen from a website can lose to a cheap thing someone mentioned in passing back in June. The second one cannot be bought that afternoon. It required that you heard something, stored it, and connected it to a date on the calendar. In a long relationship that evidence matters more than the object, because the everyday danger is not falling out of love. It is going unobserved. The four options in the poll above deliver the same proof along different routes: a remembered detail, a day built around a preference, a burden taken quietly off somebody's list, or a future plan that says the relationship still has things to look forward to. Price is the least informative part of any of them.",
     "A gentle rule: if you bought it that afternoon, add the sentence that explains why it is for them.",
     "Four gifts that work without a large budget",
     ["The detail you remembered: mention it now, then buy it later",
      "The planned day: no decisions required of the recipient from morning to night",
      "The removed burden: the appointment, the call, or the chore they dreaded",
      "The booked future: a date with a ticket attached, however small"],
     "Give the evidence, not the object",
     "Ask what each of you has mentioned twice and then forgotten. That list is a gift guide neither of you wrote on purpose. Then agree a rough ceiling so spending stops becoming a silent scoreboard. A present that costs what you can afford and says I was listening does everything a gift is supposed to do, and the receipt is the least interesting part of it."),
    ("connection",
     "What helps you feel understood without explaining yourself?",
     "Vote on the everyday signals that tell a partner they are being read correctly.",
     "Being understood is mostly a matter of being noticed. This poll asks which small signal does that best for you.",
     ["A message out of nowhere", "Noticing a change before it is named", "The right silence on a bad day", "A question about something mentioned once"],
     "How Couples Feel Understood Without Having to Explain Themselves",
     "Explanation is work, and being read correctly is relief. Here is what makes a partner feel understood before they say anything.",
     "Understanding is a habit of attention, not a talent",
     "Some people seem easy to read and others seem impossible, and most of that difference is where attention was aimed rather than how much love was felt. A partner who notices that your tone changed at dinner is not gifted. They have simply kept a record of your ordinary baseline and can tell when it moves. That record is what makes understanding look effortless, and it is available to anybody willing to pay attention on purpose. The poll above lists the four ways people most often report feeling understood, and they share one property: each requires the other person to have noticed something first and then acted on it without being asked. This is also why being understood cannot be requested. A demand to be read is a contradiction, and the moment the explanation is required the evidence has gone.",
     "One honest test: name one thing about your partner that changed this month and that they never mentioned.",
     "Four ways to prove you are paying attention",
     ["Say the thing you noticed instead of waiting to be asked about it",
      "Ask about the meeting, the neighbour, or the worry from three days ago",
      "Match the room: company on a flat day, quiet on an overloaded one",
      "Send one message during the day that proves they were on your mind"],
     "Build the baseline you want to be read from",
     "Understanding runs on ordinary data. The less a couple talk about nothing, the harder it becomes to notice when something is wrong, because there is no normal left to compare against. Start by trading one daily summary for one specific question. Not how was your day, which returns a shrug, but what happened with the thing you were dreading on Tuesday. The record builds quickly, and being understood gets easier in proportion to it."),
    ("connection",
     "What makes a difficult conversation feel safe?",
     "Vote on the conditions that let a couple raise a hard topic without it turning into a fight.",
     "Most couples avoid the difficult conversation rather than lose the argument. This poll asks what makes raising one feel survivable.",
     ["Asking permission to bring it up", "Choosing a neutral time, not a charged one", "One person speaks without answering", "Agreeing the outcome need not be instant"],
     "How to Make a Difficult Conversation Feel Safe",
     "Safety in a hard talk is mostly a matter of sequence and exit. Here is how couples make difficult topics discussable rather than avoidable.",
     "People avoid hard talks because the cost of starting them is unclear",
     "A difficult conversation feels unsafe for one specific and fixable reason: nobody knows how it ends. If raising a topic has previously produced a fight, a shutdown, or a promise that went nowhere, the brain files the subject as expensive and stops permitting the opening sentence. That is why two people can be devoted to each other and structurally unable to discuss one particular thing. The remedy is not more love. It is a clearer frame. When both people know the length, the order, and what may actually be decided, the subject stops costing an unknown amount. The four options in the poll above each reduce that unknown in a different way. Asking permission makes the opening mutual. A neutral time makes it low-stakes. One person speaking without answering makes it safe to be incomplete. Agreeing that nothing must be settled tonight makes it safe to stop.",
     "A gentle rule: raise hard topics while you are both calm, not while one of you is right.",
     "Four frames that make a difficult conversation shorter",
     ["Ask first: is now a workable time for a difficult subject",
      "Set a limit: twenty minutes, one topic, nothing in the way",
      "One at a time: the first person finishes before the second answers",
      "End with a next step, however small, or say plainly that there is none yet"],
     "Safety is built out of finished conversations",
     "The first difficult talk will be clumsy, which is the argument for attempting it while the stakes are still small. Choose a cheap subject before the expensive one: the chore arrangement rather than the family problem. Every conversation that starts and ends without damage lowers the price of the next one. Couples who can discuss hard things are not couples who stopped caring about the outcome. They are couples who have evidence, collected one awkward twenty-minute talk at a time."),
    ("date-night",
     "How far ahead should date night be planned?",
     "Vote on how much notice a good date night actually needs.",
     "Some couples need a plan on the calendar and others need the possibility of one. This poll compares the two instincts.",
     ["Booked weeks in advance", "Decided that morning", "A standing weekly night, planned later", "Spontaneous, whenever the evening opens up"],
     "How Much Notice Does Date Night Really Need",
     "Planned too early, it becomes an event to prepare for. Planned too late, it does not happen at all. Here is where the balance sits.",
     "Advance planning protects the evening from the week",
     "The reason a booked date survives and an improvised one usually does not is that a week quietly expands to fill every available evening. A plan made three weeks ahead puts a wall around one of them before the tiredness, the lift to run, and the family obligation arrive to claim it. A standing weekly night works for the same reason: the decision is taken once and then defended automatically, leaving the couple to negotiate only the content. Where advance planning fails is when the plan becomes a production. An evening that requires bookings, outfits, and travel can turn a chance to connect into a piece of logistics that one person has to manage alone, which is a poor romantic foundation for anything. The poll above sorts couples by how much of the evening they want settled in advance, and the honest answer usually depends on whose calendar the week belongs to.",
     "A fair rule: decide the date early and the activity late. Fixed evening, open content.",
     "Four planning styles and what each one costs",
     ["Booked weeks ahead: reliable, but it can become an event to prepare for",
      "Decided that morning: fresh, and the first thing a busy week destroys",
      "Standing night, planned later: the least effort and the best survival rate",
      "Purely spontaneous: thrilling, and statistically rare after the first year"],
     "Put the wall on the calendar, not the plan",
     "If date night keeps failing, stop diagnosing the activities and look at the schedule instead. Most couples are short of a defended hour rather than short of ideas. Book the recurring evening first, keep the content deliberately modest, and let the good plans be the ones that happened by accident. A protected night with nothing in it usually beats an elaborate night that needed three weeks of coordination and left both of you tired."),
    ("date-night",
     "What makes a date night feel like a real break from routine?",
     "Vote on what actually separates a memorable evening from the same week repeated in a different room.",
     "Two people can leave the house and change nothing. This poll asks what turns an ordinary evening into an exception.",
     ["Somewhere neither of us has been", "An activity with our hands busy", "No phones and no logistics talk", "A night with no fixed ending time"],
     "What Makes a Date Night Feel Different From an Ordinary Evening",
     "Novelty is not an expensive venue. It is a change of context, and it can be produced cheaply on purpose.",
     "A date night fails when it changes the location but not the mode",
     "A couple can drive forty minutes to a restaurant and have the same conversation they had at the kitchen table, about the same logistics, on the same tired frequency. The location changed and the mode did not. What makes an evening memorable is that it interrupted the running topics, and interruption requires either new input or a removed obligation. New input is the unfamiliar street, the class, the walk on which neither of you knows the way. A removed obligation is the phone in the other room, the bills not discussed, the absence of a hard stop at ten. The four options in the poll above are those four levers, and they work for one reason: each makes the ordinary week temporarily unavailable. That is also why the cheapest date can beat the expensive one, provided it pulls a lever rather than spending money.",
     "One honest test: could this evening have happened on any ordinary Tuesday? If it could, it was not a date.",
     "Four levers, in rough order of effect",
     ["Change the place: somewhere neither of you has been, however small",
      "Change the input: an activity with your hands busy and no script",
      "Remove the phone: not face down on the table, in another room",
      "Remove the clock: an evening with no fixed ending time"],
     "Use one lever, not four",
     "Attempting to change everything at once produces a schedule, which is the opposite of the effect you wanted. Pick one lever per evening and rotate through the rest. In practice a walk in an unfamiliar neighbourhood with the phones left at home outperforms a booked dinner that arrives with a timeline, a dress code, and a conversation about the plumbing. Novelty is cheap. The scarce resource is unstructured time."),
    ("relationships",
     "How do you handle wanting different amounts of time apart?",
     "Vote on the workable way to live with different needs for space inside one relationship.",
     "One person wants the weekend together and the other wants the weekend alone. This poll compares how couples handle that gap.",
     ["Schedule the alone time like anything else", "One shared day, one separate day", "Ask what the space is for, then agree", "Say honestly that the gap is hurting us"],
     "When One Partner Needs More Space Than the Other",
     "Different needs for time apart are common and rarely a verdict on the relationship. Here is how couples make the gap livable.",
     "Space is a difference of regulation, not of love",
     "The person who needs an afternoon alone is not the person who loves less, and the two things are almost unrelated. What differs is how each nervous system returns to baseline. Some people recover in company and some recover in quiet, and a couple made of one of each will keep misreading the other's need as a statement about the relationship. That misreading is the actual problem. The gap in temperament is manageable; the story built on top of it is not. The options in the poll above differ mainly in how explicit they are. Scheduled alone time stops reading as rejection once it is agreed in advance. Splitting the week makes the trade visible rather than argued about. Asking what the space is for separates a need from a withdrawal. Saying honestly that the gap hurts is the uncomfortable version, and occasionally the necessary one.",
     "A gentle rule: name the reason for the space the first time you take it, because an unexplained afternoon alone gets a story attached to it.",
     "Four arrangements that survive contact with a busy week",
     ["A fixed solo block each week, agreed in advance and defended by both",
      "One shared day and one separate day, alternating who chooses the shared one",
      "The check-in question: is this space or distance, asked kindly and answered plainly",
      "A review date: if the arrangement still hurts in a month, renegotiate rather than resent it"],
     "Watch for withdrawal, not for want",
     "Needing time alone is ordinary. Needing time away from your partner specifically, and becoming less interested in explaining why, is a different thing. The useful distinction is whether the person comes back. A partner who takes an evening alone and returns warm and talkative was regulating, not leaving. A partner who takes the same evening and returns further away has told you something worth discussing while the subject is still small enough to hold."),
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
    """Pick `count` bank entries that were never used before, one per topic.

    Returns fewer than `count` when the bank runs out, and never falls back
    to a used entry: a repeat would re-emit its companion article verbatim.
    """
    seed = int(date_str.replace("-", ""))
    rng = random.Random(seed)
    pool = [(i, e) for i, e in enumerate(POLL_BANK)]
    rng.shuffle(pool)
    by_topic = {}
    for i, e in pool:
        by_topic.setdefault(e[0], []).append((i, e))
    # Rotate the topic order by date. Iterating `sorted(by_topic)` alone
    # always started at "connection", so at --count 1 that one topic drained
    # completely before any other was reached.
    topics = sorted(by_topic)
    start = seed % len(topics)
    topics = topics[start:] + topics[:start]
    picked = []
    for topic in topics:
        if len(picked) >= count:
            break
        for i, e in by_topic[topic]:
            if "%d:%s" % (i, e[1]) in used_ids:
                continue
            picked.append((i, e))
            break
    rng.shuffle(picked)
    return picked
def js_escape(text):
    return text.replace("\\", "\\\\").replace('"', '\\"')


def entry_poll(entry):
    """First 5 fields of a bank entry: the poll itself."""
    return entry[0], entry[1], entry[2], entry[3], entry[4]


def entry_article(entry):
    """Article fields of a bank entry (present on all v2 entries)."""
    return {"title": entry[5], "dek": entry[6], "h2a": entry[7],
            "h2a_body": entry[8], "callout": entry[9], "h2b": entry[10],
            "h2b_items": list(entry[11]), "h2c": entry[12], "h2c_body": entry[13]}


def build_poll_dict(bank_index, entry, date_str, used_slugs, taken_ids):
    topic, title, description, intro, options = entry_poll(entry)
    base = slugify(title)
    slug = "%s-%s" % (base, date_str.replace("-", ""))
    n = 2
    while (slug in used_slugs
           or os.path.exists(os.path.join(POLLS_DIR, slug + ".md"))
           or os.path.exists(os.path.join(BLOG_POSTS_DIR,
                                          slug + "-companion.md"))):
        slug = "%s-%s-%d" % (base, date_str.replace("-", ""), n)
        n += 1
    if slug in taken_ids:
        slug = "%s-%s" % (slug, date_str.replace("-", ""))
    return {
        "bank_index": bank_index, "id": slug, "topic": topic,
        "label": TOPIC_LABELS[topic], "title": title,
        "description": description, "intro": intro,
        "options": list(options), "related": [],
        "article": entry_article(entry),
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
    prefix = content[:idx].rstrip()
    if not prefix.endswith(","):
        prefix += ","          # the old last entry had no trailing comma
    content = prefix + "\n" + block + content[idx:]
    with open(POLL_DATA_JS, "w", encoding="utf-8") as f:
        f.write(content)
def yaml_value(val):
    """Encode a Python value as a YAML frontmatter scalar or flow
    sequence. json.dumps output (double-quoted strings, flow lists)
    is valid YAML, so quotes, colons and unicode in titles cannot
    break frontmatter parsing."""
    if isinstance(val, bool):
        return "true" if val else "false"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, (str, list, dict)):
        return json.dumps(val, ensure_ascii=False)
    raise TypeError("cannot encode %r as frontmatter" % (val,))


def frontmatter(fields):
    """Render (key, value) pairs as a fenced YAML frontmatter block."""
    lines = ["---"]
    for key, val in fields:
        lines.append("%s: %s" % (key, yaml_value(val)))
    lines.append("---")
    return "\n".join(lines) + "\n"


def write_poll_md(path, poll, related, companion, list_order):
    """Emit src/content/polls/<id>.md. PollDetail.astro renders the
    whole page (head tags, voting scaffolding, Question/BreadcrumbList
    JSON-LD) from this frontmatter, so no HTML is written here. The
    polls index picks the entry up via listOrder."""
    fields = [
        ("question", poll["title"]),
        ("pageTitle", poll["title"]),
        ("description", poll["description"]),
        ("intro", poll["intro"]),
        ("topic", poll["label"]),
        ("slug", poll["id"]),
        ("listOrder", list_order),
        ("ogImage", "%s/assets/polls-hero-illustration.png" % SITE_URL),
        ("ogImageAlt",
         "Hands placing colorful relationship poll cards into a ballot box"),
        ("companionHref", "../blog-posts/%s.html" % companion["slug"]),
        ("companionTitle", companion["title"]),
        ("options", poll["options"]),
        ("related", [{"href": "%s.html" % r["id"], "title": r["title"]}
                     for r in related]),
        ("draft", False),
    ]
    with open(path, "w", encoding="utf-8") as f:
        f.write(frontmatter(fields))
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


TOPIC_TAG = {
    "connection": "CONNECTION",
    "relationships": "RELATIONSHIPS",
    "date-night": "DATE NIGHT",
    "seasonal": "SEASONAL",
}

TOPIC_SECTION = {
    "connection": "Connection",
    "relationships": "Relationships",
    "date-night": "Date night",
    "seasonal": "Seasonal",
}


def article_slug(poll_id):
    return poll_id + "-companion"


TOPIC_RELATED_ARTICLES = {
    "connection": [
        ("couples-communication-exercises.html",
         "couples communication exercises for more emotional intimacy"),
        ("why-modern-dating-feels-so-hard.html",
         "why modern dating feels so hard"),
        ("relationship-compatibility-guide.html",
         "the relationship compatibility guide"),
    ],
    "relationships": [
        ("relationship-compatibility-quiz.html",
         "relationship compatibility quiz"),
        ("compatibility-quiz-for-long-term-couples.html",
         "the compatibility quiz for long-term couples"),
        ("are-we-compatible-quiz.html",
         "the are we compatible quiz"),
    ],
    "date-night": [
        ("couple-bonding-activities-at-home.html",
         "couple bonding activities at home"),
        ("why-modern-dating-feels-so-hard.html",
         "why modern dating feels so hard"),
        ("relationship-compatibility-questions-quiz.html",
         "relationship compatibility questions"),
    ],
    "seasonal": [
        ("valentines-day-date-ideas-at-home.html",
         "Valentine's Day date ideas at home"),
        ("galentines-day-ideas-self-love.html",
         "Galentine's Day ideas and self-love"),
        ("couple-bonding-activities-at-home.html",
         "couple bonding activities at home"),
    ],
}

# Every companion article used to ship the same opening line, the same "read
# our guide to X" sentence, the same CTA and the same three FAQs. Across 27
# published articles that shared block was about a third of every page, and it
# made unrelated posts look like near-duplicates of each other. The pools below
# let those four slots vary: the topic keeps the wording relevant and
# _variant_n() picks a stable offset per poll, so the same entry always
# regenerates identically while neighbouring entries no longer read the same.
INTRO_VARIANTS = (
    "{intro} Vote on the question below, then use this short guide to act "
    "on your answer.",
    "{intro} Cast your vote first, then read on for a short guide you can "
    "act on this week.",
    "{intro} Make your call in the poll below, and use the guide that "
    "follows to turn it into a conversation.",
    "{intro} Answer the poll first - the short guide below turns its "
    "options into something you can try tonight.",
)

LINK_FRAMES = (
    'If you want to go further, read our guide to <a href="{file}">{anchor}</a>, '
    'or share a playful result from the <a href="../calculator.html">love '
    'calculator</a>.',
    'For the wider pattern behind this, our guide to <a href="{file}">{anchor}</a> '
    'goes deeper; the <a href="../calculator.html">love calculator</a> is the '
    'lighter way to start the same conversation.',
    'The <a href="{file}">{anchor}</a> guide covers the longer version of this. '
    'For something quicker, run a <a href="../calculator.html">love calculator</a> '
    'result and show your partner before you say anything.',
    'Two places to take this further: <a href="{file}">{anchor}</a>, or a '
    '<a href="../calculator.html">love calculator</a> result if you would '
    'rather keep it light.',
)

CTA_VARIANTS = (
    '<div class="article-callout"><strong>Your turn:</strong> Take the 10-second '
    'poll, <a href="{href}">{title}</a>, and compare your answer with your partner '
    'tonight.</div>',
    '<div class="article-callout"><strong>Keep going:</strong> Answer <a '
    'href="{href}">{title}</a>, then show your partner the gap between your two '
    'picks.</div>',
    '<div class="article-callout"><strong>One more thing:</strong> The poll on <a '
    'href="{href}">{title}</a> takes ten seconds and works best answered '
    'separately.</div>',
    '<div class="article-callout"><strong>Try this tonight:</strong> Both of you '
    'vote on <a href="{href}">{title}</a> before you discuss it, in whichever '
    'order feels least risky.</div>',
)

# Three of the four are used per article, selected and ordered by _variant_n.
# Templates may take {h2b} (the list heading of this article) so the answer
# still points at content that exists on the page. Keep them true of any poll
# in the topic: the rotation cannot know which entry it landed on.
FAQ_TEMPLATES = {
    "connection": [
        ("Does spending more time together build connection?",
         "Not by itself. Two people can share a sofa for three hours and "
         "exchange nothing. Connection follows attention, so one short "
         "undistracted conversation tends to do more than a long evening "
         "spent side by side on separate screens."),
        ("How often should a couple talk about the relationship?",
         "Less often than you might expect, but at a set time. A short weekly "
         "check-in is easier to keep than daily heavy conversations, and it "
         "stops small irritations from stacking up until they arrive all at "
         "once. Start with one item under \"{h2b}\".",),
        ("What does emotional availability actually mean?",
         "Answering instead of deflecting, and staying present when the topic "
         "is uncomfortable. If one partner routinely leaves the conversation, "
         "availability is the thing to work on before the subject of the "
         "conversation changes at all."),
        ("We like each other but feel flat. Is that a problem?",
         "It is a signal rather than a verdict. Liking someone and feeling "
         "connected to them are different things, and flatness usually means "
         "the shared-attention habit lapsed first. Repeat one item from "
         "\"{h2b}\" for three weeks before you judge whether anything moved."),
    ],
    "relationships": [
        ("Is compatibility tested or built?",
         "Both, in that order. A compatibility conversation shows where the "
         "friction is likely to sit; the everyday habits decide whether that "
         "friction turns into resentment. The two lists under \"{h2b}\" are "
         "the part worth acting on."),
        ("How do you know a boundary is reasonable?",
         "A reasonable boundary protects your own time, energy, or values "
         "rather than controlling someone else's. If the request is about "
         "what you will do next, it is usually sound. If it is about what "
         "your partner must stop doing, it needs another conversation."),
        ("Should couples keep separate friendships?",
         "Yes. Time apart is not a tax on the relationship; it is what gives "
         "each person something new to bring back into it. Couples who cancel "
         "their other plans as a rule tend to notice the cost later rather "
         "than immediately."),
        ("One of us feels the relationship is uneven. What now?",
         "Name the specific job rather than the general unfairness. Who plans "
         "the dates is discussable; you do less is not. Work down \"{h2b}\" "
         "and agree one change each, then check back in a month."),
    ],
    "date-night": [
        ("Does date night have to cost money?",
         "No. The point is a protected change of context, and a walk with "
         "both phones out of reach delivers that as reliably as a booked "
         "table. Spending usually impresses the person paying for it more "
         "than the couple."),
        ("How do you decide whose turn it is to plan?",
         "Both names on the plan, one owner per night. Rotating ownership "
         "ends the loop of two people who cannot choose a restaurant, and it "
         "keeps the work from quietly defaulting to whoever asked last."),
        ("What if one of us is bored of our usual night?",
         "Change one variable at a time - the place, the time, or the "
         "activity. Replacing all three at once is why grand reinventions "
         "tend not to survive a month, while one swapped detail usually "
         "sticks."),
        ("Are phones really the problem on date night?",
         "They are the visible part of it. A phone lying face down is a "
         "decision; a phone checked repeatedly is information about how the "
         "evening is landing. Worth noticing which of the two it is before "
         "agreeing any rules."),
    ],
    "seasonal": [
        ("How do you handle different expectations for an occasion?",
         "Write them down separately before discussing them. Expectations "
         "said out loud usually sound reasonable to both people; expectations "
         "guessed at tend to sound like a test one of you is already failing."),
        ("Do gifts have to match in value?",
         "They should match in attention. A small gift that shows you "
         "remembered a detail usually lands better than an expensive one that "
         "could have been bought for anyone at all."),
        ("Which occasion deserves the most effort?",
         "The one you both actually mention during the year, not the one with "
         "the strongest commercial build-up. Spending big on a date nobody "
         "cares about while skipping the one your partner brought up twice is "
         "how an occasion starts to feel like administration."),
        ("What if a marked date starts feeling like an obligation?",
         "That usually means the plan was chosen for appearance rather than "
         "for the two of you. Swap the format and keep the date: a shorter "
         "evening you both wanted beats a longer one neither of you did. "
         "Notice it early, while it is still a plan and not a grievance."),
    ],
}


def _variant_n(poll_id, salt=0):
    """Stable pseudo-random offset per poll id.

    Deterministic, so regenerating an entry reproduces the same wording. The
    salt gives each rotating slot (intro, links, related article, CTA, FAQ)
    its own independent offset: reusing one number everywhere would tie the
    choices together and cut the number of distinct combinations sharply.
    """
    return sum((i + 1) * ord(c) for i, c in enumerate(poll_id)) + salt * 7919


def _split_callout(text):
    """Render the body callout as "<strong>Label:</strong> rest".

    Bank entries write their own lead-in ("A gentle rule: ...", "A fair rule: ...",
    "One honest test: ..."), so the label travels with the content instead of
    being hardcoded for every article. A callout that opens with a sentence
    rather than a short label keeps the original fallback box.
    """
    head, sep, tail = text.partition(": ")
    if sep and head and len(head) <= 45 and len(head.split()) <= 6 \
            and ". " not in head and "?" not in head:
        return "<strong>%s:</strong> %s" % (html_lib.escape(head),
                                            html_lib.escape(tail))
    return "<strong>Gentle rule:</strong> " + html_lib.escape(text)


def _article_plain_text(poll):
    a = poll["article"]
    parts = [a["dek"], a["h2a"], a["h2a_body"], a["callout"], a["h2b"]]
    parts += a["h2b_items"]
    parts += [a["h2c"], a["h2c_body"], poll["intro"]]
    return " ".join(parts)


def article_word_count(poll):
    return len(_article_plain_text(poll).split())


def write_companion_md(path, poll, date_str, card_order, ld_order):
    """Emit src/content/blog/<id>-companion.md — the 400-500 word
    companion post (blog-write skill structure: Key Takeaways box,
    answer-first H2s, callout, internal links, FAQ). BlogPost.astro
    renders the page shell and the BlogPosting/BreadcrumbList JSON-LD
    from the frontmatter; the markdown body written at the end is the
    article-body HTML, exactly as the generated pages carried it."""
    a = poll["article"]
    esc = html_lib.escape
    slug = article_slug(poll["id"])
    poll_href = "../polls/%s.html" % poll["id"]
    section = TOPIC_SECTION[poll["topic"]]
    words = article_word_count(poll)
    read_time = max(3, int(round(words / 130.0)))

    co = a["callout"]
    callout_html = _split_callout(co)

    first_sentence = a["h2a_body"].split(". ")[0].strip()
    if first_sentence and not first_sentence.endswith("."):
        first_sentence += "."
    takeaways = [first_sentence, a["h2b_items"][0] + ".", co]
    takeaways_html = "".join("<li>%s</li>" % esc(t) for t in takeaways)

    items_html = "".join("<li>%s</li>" % esc(x) for x in a["h2b_items"])

    v = _variant_n(poll["id"])

    intro_p = INTRO_VARIANTS[v % len(INTRO_VARIANTS)].format(intro=poll["intro"])

    rel_file, rel_anchor = TOPIC_RELATED_ARTICLES[poll["topic"]][
        _variant_n(poll["id"], 3) % 3]
    links_p = LINK_FRAMES[_variant_n(poll["id"], 2) % len(LINK_FRAMES)].format(
        file=rel_file, anchor=esc(rel_anchor))

    cta_html = CTA_VARIANTS[_variant_n(poll["id"], 4) % len(CTA_VARIANTS)].format(
        href=poll_href, title=esc(poll["title"]))

    pool = FAQ_TEMPLATES[poll["topic"]]
    faqs = [pool[(v + k) % len(pool)] for k in range(3)]
    faqs = faqs[_variant_n(poll["id"], 5) % 3:] + \
        faqs[:_variant_n(poll["id"], 5) % 3]
    faq_html = "".join(
        "<h3>%s</h3><p>%s</p>" % (esc(q), esc(ans.format(h2b=a["h2b"],
                                                         section=section)))
        for q, ans in faqs)

    body = (
        '      <div class="article-callout key-takeaways"><strong>Key Takeaways</strong>'
        "<ul>%s</ul></div>\n"
        "      <p>%s</p>\n"
        "      <h2>%s</h2>\n"
        "      <p>%s</p>\n"
        '      <div class="article-callout">%s</div>\n'
        "      <h2>%s</h2>\n"
        "      <ul>%s</ul>\n"
        "      <h2>%s</h2>\n"
        "      <p>%s</p>\n"
        "      <p>%s</p>\n"
        "      %s\n"
        "      <h2>Frequently Asked Questions</h2>\n"
        "      %s\n"
        % (takeaways_html, esc(intro_p), esc(a["h2a"]), esc(a["h2a_body"]),
           callout_html, esc(a["h2b"]), items_html, esc(a["h2c"]),
           esc(a["h2c_body"]), links_p, cta_html, faq_html))

    keywords = [poll["title"], section.lower() + " advice",
                "couple " + section.lower() + " ideas"]
    fields = [
        ("title", a["title"]),
        ("pageTitle", a["title"]),
        ("description", a["dek"]),
        ("schemaDescription", a["dek"]),
        ("kicker", "%s · %d min read" % (section, read_time)),
        ("dek", a["dek"]),
        ("publishedLabel", "Published %s" % date_str),
        ("datePublished", date_str),
        ("dateModified", date_str),
        ("section", section),
        ("slug", slug),
        ("tag", TOPIC_TAG[poll["topic"]]),
        ("excerpt", a["dek"]),
        ("cardTitle", a["title"]),
        ("cardOrder", card_order),
        ("ldOrder", ld_order),
        ("headline", a["title"]),
        ("variant", "companion"),
        ("author", "Couple in Bond Editorial"),
        ("disclaimer", "This article is for general reflection and entertainment. "
                       "It is not therapy or professional relationship advice."),
        ("draft", False),
        ("keywords", keywords),
        ("tags", keywords),
        ("asideHtml", ""),
    ]
    with open(path, "w", encoding="utf-8") as f:
        f.write(frontmatter(fields) + "\n" + body)


def update_sitemap(new_polls, companion_slugs=()):
    with open(SITEMAP_XML, encoding="utf-8") as f:
        content = f.read()
    urls = ["%s/polls/%s.html" % (SITE_URL, p["id"]) for p in new_polls]
    urls += ["%s/blog-posts/%s.html" % (SITE_URL, s) for s in companion_slugs]
    entries = "\n".join("  <url><loc>%s</loc></url>" % u for u in urls) + "\n"
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
    """Actually parse+execute poll-data.js so syntax errors (e.g. a missing
    comma between entries) are caught instead of silently shipped."""
    check = ("const fs=require('fs');const s=fs.readFileSync(process.argv[1],'utf8');"
             "const w={};new Function('window',s)(w);"
             "console.log('polls='+w.COUPLE_POLL_DATA.length);")
    out = subprocess.run(["node", "-e", check, POLL_DATA_JS],
                         capture_output=True, text=True)
    if out.returncode != 0 or "polls=" not in out.stdout:
        raise RuntimeError("poll-data.js is invalid JS: %s" % out.stderr.strip()[:200])
    return out.stdout.strip()


def _frontmatter_int(path, key):
    with open(path, encoding="utf-8") as f:
        m = re.search(r"(?m)^%s:\s*(\d+)\s*$" % re.escape(key), f.read())
    return int(m.group(1)) if m else 0


def next_orders():
    """Next cardOrder/ldOrder (blog) and listOrder (polls): max + 1 each.

    The three orders are independent, hand-maintained ranks:
      - cardOrder: the blog grid sorts descending, so max+1 prepends a card;
      - ldOrder:   the blog ItemList JSON-LD sorts ascending, so max+1 appends;
      - listOrder: the polls index sorts ascending, so max+1 appends.
    """
    card = ld = lst = 0
    for name in os.listdir(BLOG_POSTS_DIR):
        if name.endswith(".md"):
            path = os.path.join(BLOG_POSTS_DIR, name)
            card = max(card, _frontmatter_int(path, "cardOrder"))
            ld = max(ld, _frontmatter_int(path, "ldOrder"))
    for name in os.listdir(POLLS_DIR):
        if name.endswith(".md"):
            path = os.path.join(POLLS_DIR, name)
            lst = max(lst, _frontmatter_int(path, "listOrder"))
    return card + 1, ld + 1, lst + 1


# Frontmatter keys the content schema requires (see src/content.config.ts).
POLL_MD_KEYS = ("question", "pageTitle", "description", "intro", "topic",
                "slug", "listOrder", "ogImage")
COMPANION_MD_KEYS = ("title", "pageTitle", "description", "schemaDescription",
                     "kicker", "dek", "publishedLabel", "datePublished",
                     "dateModified", "section", "slug", "tag", "excerpt",
                     "cardTitle", "cardOrder", "ldOrder", "author",
                     "disclaimer")


def validate_frontmatter(checked):
    """Every generated .md must carry fenced frontmatter with each required
    key, or the Astro content schema fails the build."""
    for path, required in checked:
        with open(path, encoding="utf-8") as f:
            text = f.read()
        base = os.path.basename(path)
        if not text.startswith("---\n"):
            raise RuntimeError("%s: missing opening frontmatter fence" % base)
        end = text.find("\n---\n", 3)
        if end == -1:
            raise RuntimeError("%s: missing closing frontmatter fence" % base)
        head = text[:end]
        missing = [k for k in required
                   if not re.search(r"(?m)^%s:" % re.escape(k), head)]
        if missing:
            raise RuntimeError("%s: missing frontmatter keys: %s"
                               % (base, ", ".join(missing)))
    return "frontmatter ok (%d files)" % len(checked)
# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Generate daily Couple in Bond polls.")
    ap.add_argument("--count", type=int, default=1, choices=[1, 2, 3],
                    help="polls to generate (default: 1)")
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
    if len(picked) < args.count:
        print("ERROR: poll bank exhausted - %d unused entry(ies), %d requested."
              % (len(picked), args.count), file=sys.stderr)
        print("Add entries to POLL_BANK in scripts/daily_polls.py. Nothing was"
              " written: republishing a bank entry would duplicate an existing"
              " poll and companion article byte for byte.", file=sys.stderr)
        return 1
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

    # Content-collection pages: PollDetail.astro and BlogPost.astro
    # render the page shells, JSON-LD and index cards from
    # frontmatter, so the generator only writes markdown. Index
    # orders within a batch: the first poll keeps the top card
    # slot (cardOrder sorts descending) while every entry appends
    # to the JSON-LD ItemLists (ldOrder and listOrder sort
    # ascending), matching the old HTML patching.
    card_order, ld_order, list_order = next_orders()
    n_new = len(new_polls)
    with open(POLL_DATA_JS, encoding="utf-8") as f:
        data_js = f.read()
    titles = dict(re.findall(r'id:\s*"([^"]+)"[\s\S]{0,400}?title:\s*"([^"]+)"', data_js))
    checked = []
    companions = []
    for i, p in enumerate(new_polls):
        rel = [{"id": r, "title": titles.get(r, r)} for r in p["related"]]
        companion = {"slug": article_slug(p["id"]), "title": p["article"]["title"]}
        poll_md = os.path.join(POLLS_DIR, p["id"] + ".md")
        write_poll_md(poll_md, p, rel, companion, list_order + i)
        checked.append((poll_md, POLL_MD_KEYS))
        print("  wrote src/content/polls/%s.md" % p["id"])

        art_md = os.path.join(BLOG_POSTS_DIR, companion["slug"] + ".md")
        write_companion_md(art_md, p, date_str,
                           card_order + (n_new - 1 - i), ld_order + i)
        checked.append((art_md, COMPANION_MD_KEYS))
        companions.append(companion["slug"])
        print("  wrote src/content/blog/%s.md (%d words)"
              % (companion["slug"], article_word_count(p)))

    update_sitemap(new_polls, companions)
    print("  updated poll-data.js, sitemap.xml")
    print("  (blog.html / polls.html regenerate from the content collections)")

    # Validate hard: a failure here blocks the commit/push below.
    try:
        print("  validation: %s" % validate_poll_js())
        print("  validation: %s" % validate_frontmatter(checked))
    except Exception as exc:  # noqa: BLE001 - fail closed, do not commit
        print("  FAILED VALIDATION - nothing committed or pushed.")
        print("  reason: %s" % exc)
        print("  fix the issue above, then re-run. Files on disk were regenerated.")
        return 1

    for p in new_polls:
        used_ids.add("%d:%s" % (p["bank_index"], POLL_BANK[p["bank_index"]][1]))
        used_slugs.add(p["id"])
    save_history(used_ids, used_slugs)

    if args.push:
        args.commit = True
    if args.commit:
        git_run(["add", "public/poll-data.js", "src/content/polls",
                 "src/content/blog", "public/sitemap.xml",
                 "scripts/poll_history.json"])
        git_run(["commit", "-m",
                 "Add %d daily poll(s) + companion articles for %s"
                 % (len(new_polls), date_str)])
        print("  committed.")
    if args.push:
        git_run(["push", "origin", "main"])
        print("  pushed to origin/main (Vercel will redeploy).")

    print("DONE: %d poll(s) posted for %s." % (len(new_polls), date_str))
    return 0


if __name__ == "__main__":
    sys.exit(main())

