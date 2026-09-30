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
    content = content[:idx] + "\n" + block + content[idx:]
    with open(POLL_DATA_JS, "w", encoding="utf-8") as f:
        f.write(content)
def render_detail_page(poll, related_polls, companion=None):
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
    if companion:
        companion_html = (
            '<section class="poll-companion" aria-labelledby="companion-reading">'
            '<div class="blog-kicker">Read the guide</div>'
            '<h2 id="companion-reading">Go deeper on this topic</h2>'
            '<p><a href="../blog-posts/%s.html">%s</a></p></section>'
            % (companion["slug"], esc(companion["title"])))
    else:
        companion_html = ""
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
      %s
      <p class="poll-detail-note">This static poll records one vote in your browser so you can compare your own choice with the local result. It is designed for conversation and reflection, not scientific measurement.</p>
    </main>
    <footer class="blog-footer"><p>&copy; 2026 Couple in Bond. All rights reserved.</p><p><a href="../calculator.html">Love calculator</a> &middot; <a href="../quotes.html">Love quotes</a> &middot; <a href="../polls.html">All polls</a></p></footer>
  </div></div>
</body>
</html>
""" % (title, desc, url, title, desc, url, og_image, title, desc, og_image,
        ld, poll["id"], poll["label"], poll["label"], title, desc, intro,
        title, options_html, rel_cards, companion_html)
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


BLOG_POSTS_DIR = os.path.join(REPO_ROOT, "blog-posts")
BLOG_HTML = os.path.join(REPO_ROOT, "blog.html")

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


TOPIC_RELATED_ARTICLE = {
    "connection": ("couples-communication-exercises.html",
                   "couples communication exercises for more emotional intimacy"),
    "relationships": ("relationship-compatibility-quiz.html",
                      "relationship compatibility quiz"),
    "date-night": ("couple-bonding-activities-at-home.html",
                   "couple bonding activities at home"),
    "seasonal": ("valentines-day-date-ideas-at-home.html",
                 "Valentine's Day date ideas at home"),
}


def _article_plain_text(poll):
    a = poll["article"]
    parts = [a["dek"], a["h2a"], a["h2a_body"], a["callout"], a["h2b"]]
    parts += a["h2b_items"]
    parts += [a["h2c"], a["h2c_body"], poll["intro"]]
    return " ".join(parts)


def article_word_count(poll):
    return len(_article_plain_text(poll).split())


def render_article_page(poll, date_str):
    """400-500 word companion blog post (blog-write skill structure:
    Key Takeaways box, answer-first H2s, callout, internal links, FAQ)."""
    a = poll["article"]
    esc = html_lib.escape
    slug = article_slug(poll["id"])
    url = "%s/blog-posts/%s.html" % (SITE_URL, slug)
    poll_href = "../polls/%s.html" % poll["id"]
    og_image = "%s/assets/social-share.jpg" % SITE_URL
    tag = TOPIC_TAG[poll["topic"]]
    section = TOPIC_SECTION[poll["topic"]]
    rel_file, rel_anchor = TOPIC_RELATED_ARTICLE[poll["topic"]]
    words = article_word_count(poll)
    read_time = max(3, int(round(words / 130.0)))

    co = a["callout"]
    if co.startswith("A gentle rule: "):
        callout_html = "<strong>A gentle rule:</strong> " + esc(co[len("A gentle rule: "):])
    else:
        callout_html = "<strong>Gentle rule:</strong> " + esc(co)

    first_sentence = a["h2a_body"].split(". ")[0].strip()
    if first_sentence and not first_sentence.endswith("."):
        first_sentence += "."
    takeaways = [first_sentence, a["h2b_items"][0] + ".", co]
    takeaways_html = "".join("<li>%s</li>" % esc(t) for t in takeaways)

    items_html = "".join("<li>%s</li>" % esc(x) for x in a["h2b_items"])

    intro_p = ("%s Vote on the question below, then use this short guide to act "
               "on your answer." % poll["intro"])

    links_p = ("If you want to go further, read our guide to "
               '<a href="%s">%s</a>, or share a playful result from the '
               '<a href="../calculator.html">love calculator</a>.'
               % (rel_file, esc(rel_anchor)))

    cta_html = ('<div class="article-callout"><strong>Your turn:</strong> '
                'Take the 10-second poll, <a href="%s">%s</a>, and compare your '
                'answer with your partner tonight.</div>' % (poll_href, esc(poll["title"])))

    faqs = [
        ("How should we use this poll as a couple?",
         "Vote separately, then compare. The poll below is a conversation starter, not a "
         "test, and the gap between your two answers is where the most useful talk begins."),
        ("What is the fastest way to start?",
         'Pick one idea from "%s" and try it this week. One small, repeatable action beats '
         "a long list you never get around to." % a["h2b"]),
        ("Does this apply to long-term couples too?",
         "Yes. These ideas work best repeated over years, not performed once. Long-term "
         "couples get more from a small habit they keep than a grand gesture they do once."),
    ]
    faq_html = "".join("<h3>%s</h3><p>%s</p>" % (esc(q), esc(ans)) for q, ans in faqs)

    ld = json.dumps({
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "BlogPosting",
             "@id": url + "#article", "headline": a["title"],
             "description": a["dek"], "url": url,
             "mainEntityOfPage": {"@type": "WebPage", "@id": url},
             "image": og_image, "datePublished": date_str, "dateModified": date_str,
             "author": {"@type": "Organization", "name": "Couple in Bond Editorial",
                        "url": SITE_URL + "/blog.html"},
             "publisher": {"@type": "Organization", "name": "Couple in Bond",
                           "url": SITE_URL + "/",
                           "logo": {"@type": "ImageObject", "url": og_image}},
             "articleSection": section, "inLanguage": "en",
             "keywords": [poll["title"], section.lower() + " advice",
                          "couple " + section.lower() + " ideas"]},
            {"@type": "BreadcrumbList", "@id": url + "#breadcrumbs",
             "itemListElement": [
                 {"@type": "ListItem", "position": 1, "name": "Blog",
                  "item": SITE_URL + "/blog.html"},
                 {"@type": "ListItem", "position": 2, "name": a["title"], "item": url}]},
        ],
    }, ensure_ascii=False)

    return """<!-- Current CoupleIn theme reminder: preserve the pink-to-lilac gradient, rounded white cards, coral/plum accents, and playful relationship tone. -->
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>%s &mdash; Couple in Bond</title>
  <link rel="stylesheet" href="../blog.css"><script src="../blog-nav.js" defer></script>
  <script type="application/ld+json">%s</script>
  <meta name="description" content="%s">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <meta name="theme-color" content="#ff4d6d">
  <link rel="canonical" href="%s">
  <link rel="icon" href="../assets/coupleinbond-favicon.png">
  <link rel="apple-touch-icon" href="../assets/coupleinbond-favicon.png">
  <meta property="og:title" content="%s &mdash; Couple in Bond">
  <meta property="og:description" content="%s">
  <meta property="og:url" content="%s">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Couple in Bond">
  <meta property="og:locale" content="en_US">
  <meta property="og:image" content="%s">
  <meta property="og:image:alt" content="Couple in Bond relationship tools and bonding ideas">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="%s &mdash; Couple in Bond">
  <meta name="twitter:description" content="%s">
  <meta name="twitter:image" content="%s">
</head>
<body>
  <div class="blog-shell"><div class="blog-wrap">
    <header class="blog-nav" data-root=".."><a class="blog-brand" href="../index.html">💕 Couple in Bond</a><nav class="blog-nav-links" aria-label="Article navigation"><a href="../blog.html">Blog</a><a href="../polls.html">Polls</a><a href="../calculator.html">Calculator</a></nav></header>
    <main class="article-layout"><article class="article-shell"><header class="article-header"><div class="blog-kicker">%s &middot; %d min read</div><h1>%s</h1><p class="article-dek">%s</p><div class="article-meta"><span>Published %s</span><span>&middot;</span><span>By Couple in Bond Editorial</span></div></header><div class="article-body">
      <div class="article-callout key-takeaways"><strong>Key Takeaways</strong><ul>%s</ul></div>
      <p>%s</p>
      <h2>%s</h2>
      <p>%s</p>
      <div class="article-callout">%s</div>
      <h2>%s</h2>
      <ul>%s</ul>
      <h2>%s</h2>
      <p>%s</p>
      <p>%s</p>
      %s
      <h2>Frequently Asked Questions</h2>
      %s
    </div><footer class="article-footer">This article is for general reflection and entertainment. It is not therapy or professional relationship advice.</footer></article></main>
    <footer class="blog-footer"><p>&copy; 2026 Couple in Bond. All rights reserved.</p><p><a href="../blog.html">More relationship ideas</a> &middot; <a href="../polls.html">All polls</a></p></footer>
  </div></div>
</body>
</html>
""" % (esc(a["title"]), ld, esc(a["dek"]), url, esc(a["title"]), esc(a["dek"]),
        url, og_image, esc(a["title"]), esc(a["dek"]), og_image,
        section, read_time, esc(a["title"]), esc(a["dek"]), date_str,
        takeaways_html, esc(intro_p), esc(a["h2a"]), esc(a["h2a_body"]),
        callout_html, esc(a["h2b"]), items_html, esc(a["h2c"]), esc(a["h2c_body"]),
        links_p, cta_html, faq_html)
def update_blog_html(articles):
    """Prepend one blog card per new article and extend the Blog ItemList JSON-LD."""
    if not articles:
        return
    with open(BLOG_HTML, encoding="utf-8") as f:
        content = f.read()

    cards = []
    for art in articles:
        cards.append(
            '          <article class="blog-card">\n'
            '            <div class="blog-card-top"><span class="blog-tag">%s</span>'
            '<span>%d min read</span></div>\n'
            '            <h3><a href="blog-posts/%s.html">%s</a></h3>\n'
            '            <p>%s</p>\n'
            '            <a class="blog-card-link" href="blog-posts/%s.html">Read the story →</a>\n'
            '          </article>\n' % (
                art["tag"], art["read_time"], art["slug"],
                html_lib.escape(art["title"]), html_lib.escape(art["dek"]),
                art["slug"]))
    grid_anchor = '<section class="blog-grid" aria-label="Latest blog posts">\n'
    if grid_anchor not in content:
        raise RuntimeError("Could not find blog-grid anchor in blog.html")
    content = content.replace(grid_anchor, grid_anchor + "".join(cards), 1)

    positions = [int(x) for x in re.findall(r'"position":\s*(\d+)', content)]
    pos = max(positions) if positions else 0
    items = []
    for art in articles:
        pos += 1
        items.append(
            '          { "@type": "ListItem", "position": %d, '
            '"url": "%s/blog-posts/%s.html", "name": %s }'
            % (pos, SITE_URL, art["slug"],
               json.dumps(art["title"], ensure_ascii=False)))
    list_anchor = '\n        ]\n      },\n      {\n        "@type": "Organization"'
    if list_anchor not in content:
        raise RuntimeError("Could not find blog ItemList anchor in blog.html")
    content = content.replace(list_anchor, ",\n" + ",\n".join(items) + list_anchor, 1)

    item_count = len(re.findall(r'"@type":\s*"ListItem"', content))
    content = re.sub(r'("numberOfItems":\s*)\d+',
                     lambda m: m.group(1) + str(item_count), content, count=1)
    content = content.replace(
        "Ten starting points for kinder conversations, brighter rituals, and more thoughtful check-ins.",
        "Fresh starting points for kinder conversations, brighter rituals, and more thoughtful check-ins.")
    with open(BLOG_HTML, "w", encoding="utf-8") as f:
        f.write(content)


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
    articles = []
    for p in new_polls:
        rel = [{"id": r, "title": titles.get(r, r)} for r in p["related"]]
        companion = {"slug": article_slug(p["id"]), "title": p["article"]["title"]}
        page = render_detail_page(p, rel, companion=companion)
        with open(os.path.join(POLLS_DIR, p["id"] + ".html"), "w", encoding="utf-8") as f:
            f.write(page)
        print("  wrote polls/%s.html" % p["id"])

        art_html = render_article_page(p, date_str)
        art_file = os.path.join(BLOG_POSTS_DIR, companion["slug"] + ".html")
        with open(art_file, "w", encoding="utf-8") as f:
            f.write(art_html)
        articles.append({
            "slug": companion["slug"], "title": p["article"]["title"],
            "dek": p["article"]["dek"], "tag": TOPIC_TAG[p["topic"]],
            "read_time": max(3, int(round(article_word_count(p) / 130.0)))})
        print("  wrote blog-posts/%s.html (%d words)" % (companion["slug"], article_word_count(p)))

    update_polls_html(new_polls)
    update_blog_html(articles)
    update_sitemap(new_polls, [a["slug"] for a in articles])
    print("  updated poll-data.js, polls.html, blog.html, sitemap.xml")

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
        git_run(["add", "poll-data.js", "polls", "blog-posts", "polls.html",
                 "blog.html", "sitemap.xml", "scripts/poll_history.json"])
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

