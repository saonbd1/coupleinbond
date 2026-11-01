// Blog cover + in-article images.
//
// Sourcing rules
// --------------
// Every photo comes from Wikimedia Commons' "Images from Unsplash" category, a
// curated set of Unsplash photographs re-released as CC0 (public-domain
// dedication). CC0 needs no attribution and allows commercial use, so the site
// ships them with a courtesy credit line and a link to the Commons file page.
//
// What the script does
// --------------------
//  1. Resolves each catalogued Commons file to a 2200px rendition + metadata.
//  2. Writes two derivatives per image with sharp:
//       public/assets/blog/<key>-cover.jpg   1200x675 (16:9) — article header,
//                                            blog cards, og:image
//       public/assets/blog/<key>-body.jpg    1200x800 (3:2)  — in-article figure
//  3. Patches each post in src/content/blog/*.md:
//       - coverImage / coverImageAlt / coverImageCredit / coverImageCreditUrl
//         frontmatter, inserted after `slug:`
//       - one <figure class="article-figure"> block in the body, wrapped in
//         `<!-- cib:body-image:start -->` markers so re-runs replace it.
//
// Usage
// -----
//   node scripts/blog-images.mjs            # download missing, then patch
//   node scripts/blog-images.mjs --force    # re-download every image
//   node scripts/blog-images.mjs --check    # verify only, exit 1 on problems
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const blogDir = path.join(rootDir, 'src', 'content', 'blog');
const outDir = path.join(rootDir, 'public', 'assets', 'blog');
const UA = 'CoupleInBond/1.0 (blog cover images; editor@couplein.bond)';

// key -> Commons file title, alt text, and caption.
// Covers crop 16:9 and body images 3:2, so both alts describe the photo itself.
const CATALOG = {
  // --- Quizzes / compatibility ---
  'inked-couple': {
    file: 'File:Inked couple (Unsplash).jpg',
    alt: 'Two tattooed partners standing close, looking into each other’s eyes',
    caption: 'Compatibility is less about matching hobbies than about facing each other honestly.',
  },
  'hands-wall': {
    file: 'File:Couple holding hands by a wall (Unsplash).jpg',
    alt: 'A couple holding hands while standing apart against a white brick wall',
    caption: 'A quiz only starts the conversation — the holding on is the real test.',
  },
  'young-love': {
    file: 'File:Young love in summer (Unsplash).jpg',
    alt: 'A young couple standing close together in warm summer light',
    caption: 'Early days are for noticing patterns, not for rushing a verdict.',
  },
  'coffee-cups-ground': {
    file: 'File:Always, Together (Unsplash).jpg',
    alt: 'Two takeaway coffee cups resting side by side on the ground',
    caption: 'Modern dating runs on small, repeated choices to show up.',
  },
  'coffee-hands-table': {
    file: 'File:Friends talking over tea (Unsplash).jpg',
    alt: 'Two pairs of hands around glasses of tea across a table',
    caption: 'Understanding starts with one unhurried conversation.',
  },
  'hands-golden-gate': {
    file: 'File:Holding hands (Unsplash).jpg',
    alt: 'Two people holding hands with the Golden Gate Bridge in the distance',
    caption: 'Different love languages still meet in the same gesture.',
  },
  'heart-hands': {
    file: 'File:Love under setting sun (Unsplash).jpg',
    alt: 'Two hands forming a heart shape around the setting sun',
    caption: 'Small, specific gestures carry more weight than grand declarations.',
  },
  'silhouette-beach': {
    file: 'File:Happily ever after (Unsplash).jpg',
    alt: 'Silhouette of a couple standing together on a beach at sunset',
    caption: 'A compatibility result is a starting point, not a forecast.',
  },
  'journaling-coffee': {
    file: 'File:Journaling over coffee (Unsplash).jpg',
    alt: 'Hands writing in a journal beside coffee, photos, and a laptop',
    caption: 'Questions written down are easier to answer honestly.',
  },
  'letters-tiles': {
    file: 'File:Letters (Unsplash).jpg',
    alt: 'Colourful letter tiles scattered across a surface',
    caption: 'The best compatibility questions are specific and answerable.',
  },
  'walking-hands': {
    file: 'File:Adult couple holding hands.jpg',
    alt: 'A couple walking hand in hand along a path',
    caption: 'Shared direction shows up in ordinary walks.',
  },
  'elderly-hands': {
    file: 'File:Groom touching wedding band (Unsplash).jpg',
    alt: 'Black and white close-up of two ringed hands interlocked',
    caption: 'Long-term compatibility is built in decades of small repairs.',
  },
  'wedding-cliff': {
    file: 'File:Wedding couple hug on cliff (Unsplash).jpg',
    alt: 'A couple embracing on a cliff edge above a wide landscape',
    caption: 'An anniversary marks the work of staying, not a performance.',
  },
  'rings-hands': {
    file: 'File:Bride holds wedding bands (Unsplash).jpg',
    alt: 'A bride’s hands cupping two wedding bands',
    caption: 'Rings are a symbol; the promises behind them need restating.',
  },
  'couple-paradise': {
    file: 'File:Couple in Paradise. (Unsplash).jpg',
    alt: 'A couple standing together with a tropical coastline behind them',
    caption: 'A guide is only as useful as the conversations it starts.',
  },

  // --- Home / date night / dining ---
  'cozy-sofa': {
    file: 'File:Cozy interior with a sofa (Unsplash).jpg',
    alt: 'A cosy living room with a grey sofa, cushions, and warm daylight',
    caption: 'Home works as a venue when the evening is treated like an occasion.',
  },
  'couch-couple': {
    file: 'File:Couch Serenade (Unsplash).jpg',
    alt: 'A couple relaxing together on a sofa in low evening light',
    caption: 'Reconnecting after a hard day rarely needs more than a sofa and attention.',
  },
  'dinner-wine-closeup': {
    file: 'File:Table of wine and snacks (Unsplash).jpg',
    alt: 'Wine glasses and small plates on a dark wooden restaurant table',
    caption: 'A protected evening feels different the moment the table is set.',
  },
  'bistro-table': {
    file: 'File:Dinner at a bistro (Unsplash).jpg',
    alt: 'A set bistro table for two beside a stone wall with wine glasses',
    caption: 'Two chairs, one plan: presence is the point.',
  },
  'restaurant-dusk': {
    file: 'File:Restaurant at dusk (Unsplash).jpg',
    alt: 'A warmly lit restaurant interior at dusk with tables and bokeh light',
    caption: 'The last ten minutes of a date are what both people remember.',
  },
  'wine-hands': {
    file: 'File:Wine Night (Unsplash).jpg',
    alt: 'A glass of wine held in soft focus with a partner in the background',
    caption: 'Novelty keeps a long relationship curious.',
  },
  'wine-bar': {
    file: 'File:Outdoor wine dinner (Unsplash).jpg',
    alt: 'A red wine glass on a wooden table with bistro lights behind',
    caption: 'Rituals beat grand gestures — a standing wine night outlasts a surprise trip.',
  },
  'steak-dinner': {
    file: 'File:Steak Dinner for Two (Unsplash).jpg',
    alt: 'A plated steak dinner with vegetables photographed close up',
    caption: 'Food is the excuse; the hour together is the date.',
  },
  'picnic-basket': {
    file: 'File:Picnic basket (Unsplash).jpg',
    alt: 'A picnic basket on a red checkered tablecloth outdoors',
    caption: 'Budget dates work because the effort, not the price, is visible.',
  },
  'eating-together': {
    file: 'File:Eating Together (Unsplash).jpg',
    alt: 'A shared table with bread, salad, and bowls being passed between hands',
    caption: 'A shared meal is one of the cheapest ways to feel close.',
  },
  'notebook-coffee': {
    file: 'File:Planning over coffee (Unsplash).jpg',
    alt: 'An open notebook, pen, and coffee cup on a wooden desk',
    caption: 'Naming whose turn it is ends the invisible-work argument.',
  },
  'chairs-table': {
    file: 'File:Conversation table (Unsplash).jpg',
    alt: 'Two chairs facing each other across a table in silhouette',
    caption: 'One plan, two people — the seat facing yours matters.',
  },
  'calendar': {
    file: 'File:Monthly schedule (Unsplash).jpg',
    alt: 'An open monthly planner showing a grid of dates',
    caption: 'Date night survives when it lives on the calendar.',
  },

  // --- Weather / phones / staying in ---
  'rainy-umbrella': {
    file: 'File:Couple sharing umbrella (Unsplash).jpg',
    alt: 'A couple walking away from camera under one umbrella in cold weather',
    caption: 'Bad weather is a good excuse for a slower evening.',
  },
  'rain-window': {
    file: 'File:Rain on window (Unsplash).jpg',
    alt: 'Raindrops on a window with blurred city colours behind them',
    caption: 'The sound of rain does half the work of setting a mood.',
  },
  'devices-couch': {
    file: 'File:Mobile technology on a sofa (Unsplash).jpg',
    alt: 'A tablet and a phone lying face up on a grey sofa cushion',
    caption: 'Phones parked out of reach change the whole evening.',
  },
  'payphones': {
    file: 'File:Hang up the phone. (Unsplash).jpg',
    alt: 'A row of public payphones mounted on a tiled wall',
    caption: 'A boundary works better as an agreement than as a rule.',
  },
  'phone-beach': {
    file: 'File:Phone overseas. (Unsplash).jpg',
    alt: 'A hand holding a smartphone photographing a beach at dusk',
    caption: 'A phone policy is really a presence policy.',
  },
  'woman-phone': {
    file: 'File:Concerned Phone Call (Unsplash).jpg',
    alt: 'A woman holding a phone to her ear with a worried expression',
    caption: 'Distance is hardest in the moments you cannot share.',
  },
  'phone-sunset': {
    file: 'File:On the phone (Unsplash).jpg',
    alt: 'A man on a phone call outdoors at sunset with warm lens flare',
    caption: 'Long distance runs on scheduled calls, not on luck.',
  },
  'laptop-mug': {
    file: 'File:Laptop and a mug (Unsplash).jpg',
    alt: 'A laptop, mug, and notebook on a wooden desk',
    caption: 'Shared ordinary time is what closes the distance.',
  },

  // --- Repair / support / appreciation ---
  'embrace-doorway': {
    file: 'File:Embracing by brick wall (Unsplash).jpg',
    alt: 'A couple embracing in a brick doorway at dusk',
    caption: 'Repair starts with turning toward each other, not winning.',
  },
  'hug-winter': {
    file: 'File:Hugging in the winter (Unsplash).jpg',
    alt: 'A couple hugging outdoors in winter coats',
    caption: 'The first hour after a fight decides the next three days.',
  },
  'hands-back': {
    file: 'File:Embrace (Unsplash).jpg',
    alt: 'Close-up of a hand resting gently on a partner’s back',
    caption: 'Touch often says the apology before the words arrive.',
  },
  'forehead-kiss': {
    file: 'File:Forehead kiss in the forest (Unsplash).jpg',
    alt: 'A couple sharing a forehead kiss in woodland light',
    caption: 'Being understood usually feels quieter than being advised.',
  },
  'couple-field-golden': {
    file: 'File:Love Story (Unsplash).jpg',
    alt: 'A couple sitting close together in a field at golden hour',
    caption: 'Feeling understood is mostly about being listened to without interruption.',
  },
  'couple-blanket': {
    file: 'File:Couple relaxing on a blanket (Unsplash).jpg',
    alt: 'A couple lying beside each other on a wooden deck',
    caption: 'Comfortable silence is its own kind of understanding.',
  },
  'writing-note': {
    file: 'File:Person writing on brown wooden table near white ceramic mug.jpg',
    alt: 'A person writing in a notebook beside a mug on a wooden table',
    caption: 'Specific thanks land harder than general praise.',
  },
  'journal-writing': {
    file: 'File:Writing in a journal (Unsplash).jpg',
    alt: 'Hands writing in a notebook with a croissant and coffee nearby',
    caption: 'Appreciation is easiest to remember when it is written down.',
  },

  // --- Friendship / family / seasonal ---
  'friends-outdoors': {
    file: 'File:Young people in conversation (Unsplash).jpg',
    alt: 'Three friends standing outdoors talking together',
    caption: 'Friendships need maintenance that has nothing to do with your partner.',
  },
  'friends-diner': {
    file: 'File:Friends eating lunch in diner (Unsplash).jpg',
    alt: 'Hands around a diner table with burgers and fries',
    caption: 'Keeping both circles alive takes a little scheduling, not a fight.',
  },
  'coffee-toast': {
    file: 'File:Coffee and Friends (Unsplash).jpg',
    alt: 'Three friends toasting with coffee cups over a table',
    caption: 'Friendship is its own kind of romance.',
  },
  'brunch-overhead': {
    file: 'File:Brunching with Friends (Unsplash).jpg',
    alt: 'An overhead view of a brunch table with hands reaching for food',
    caption: 'A standing brunch keeps a friendship alive through busy seasons.',
  },
  'best-friends': {
    file: 'File:Best friends (Unsplash).jpg',
    alt: 'Two friends laughing together outdoors',
    caption: 'Friendships deserve the same planning as date night.',
  },
  'group-burgers': {
    file: 'File:Friends eating lunch in diner (Unsplash).jpg',
    alt: 'A group of friends sharing a casual meal around a table',
    caption: 'Low-stakes shared meals keep friendships from drifting.',
  },
  'family-bench': {
    file: 'File:Family at Cottesloe beach (Unsplash).jpg',
    alt: 'A family sitting together on a beach bench',
    caption: 'Meeting the family goes better when you plan one shared moment.',
  },
  'beach-sunset': {
    file: 'File:Family watching beach sunset (Unsplash).jpg',
    alt: 'Two people watching the sunset together on a beach',
    caption: 'A calm first meeting beats an impressive one.',
  },
  'christmas-flatlay': {
    file: 'File:Christmas decorations in flatlay (Unsplash).jpg',
    alt: 'Christmas decorations, a heart ornament, and twine arranged on wood',
    caption: 'Holidays get easier when the plan is shared before the calendar fills.',
  },
  'christmas-cookies': {
    file: 'File:Christmas cookies (Unsplash).jpg',
    alt: 'Christmas cookies, cinnamon sticks, and spices arranged on a surface',
    caption: 'A small shared ritual beats an exhausted perfect holiday.',
  },
  'bouquet': {
    file: "File:Valentine's bouquet (Unsplash).jpg",
    alt: 'A jug of pink and white flowers with a handwritten gift tag',
    caption: 'A home Valentine’s works with flowers, food, and a phone-free hour.',
  },
  'tulips-love': {
    file: 'File:Tulips from a lover (Unsplash).jpg',
    alt: 'A bunch of tulips lying beside a handwritten note that reads love',
    caption: 'Surprises land hardest when they match how your partner receives care.',
  },
  'gift-tags': {
    file: "File:Valentine's Day gift (Unsplash).jpg",
    alt: 'Kraft gift tags with handwritten notes reading kiss me',
    caption: 'In long relationships, the note inside the gift does the work.',
  },
  'gift-parcel': {
    file: 'File:Brown paper gift (Unsplash).jpg',
    alt: 'A wrapped brown paper parcel with a tag and red twine',
    caption: 'Knowing what someone needs is the real gift.',
  },

  // --- Spark / adventure / quality time ---
  'love-sparkler': {
    file: 'File:Love in sparkles (Unsplash).jpg',
    alt: 'The word love written in the air with a sparkler',
    caption: 'Spark is a practice, not a personality trait.',
  },
  'couple-silhouette-tree': {
    file: 'File:Pink sunset couple (Unsplash).jpg',
    alt: 'Silhouettes of a couple sitting under a tree at sunset',
    caption: 'Curiosity, repeated, is what makes a long relationship feel new.',
  },
  'hill-sunset': {
    file: 'File:Kissing during the sunset (Unsplash).jpg',
    alt: 'A couple kissing on a hilltop at sunset',
    caption: 'Talking about the future works best without a deadline.',
  },
  'coastal-love': {
    file: 'File:Coastal Love (Unsplash).jpg',
    alt: 'A wide coastal view with calm water and a distant lighthouse',
    caption: 'Shared direction is easier to name on a slow walk.',
  },
  'couple-beach-wide': {
    file: 'File:Couple on the beach (Unsplash).jpg',
    alt: 'A couple walking along a wide, empty beach',
    caption: 'Quality time is attention, not duration.',
  },
  'couple-backpacks': {
    file: 'File:Exploring Together (Unsplash).jpg',
    alt: 'Two people walking away together in the countryside',
    caption: 'Shared plans count more than shared hobbies.',
  },

  // --- Home work / chores / morning / quiet ---
  'feet-grass': {
    file: 'File:Couple stands together on grass (Unsplash).jpg',
    alt: 'Two pairs of feet standing close together on grass',
    caption: 'Equality is visible in the small decisions, not the big speeches.',
  },
  'couple-walking-street': {
    file: 'File:Chilling lovers. (Unsplash).jpg',
    alt: 'A couple walking side by side through a quiet street',
    caption: 'Difficult conversations go better moving than sitting across a table.',
  },
  'home-work': {
    file: 'File:Couple working at home (Unsplash).jpg',
    alt: 'Two people working at a shared table at home',
    caption: 'Staying in works when the evening has a shape.',
  },
  'kitchen-table': {
    file: 'File:Kitchen table (Unsplash).jpg',
    alt: 'A rustic kitchen table with bread, jars, and cooking tools',
    caption: 'Cooking together is teamwork with an edible result.',
  },
  'chores-pots': {
    file: 'File:Chores in the morning (Unsplash).jpg',
    alt: 'A shelf of well-used cooking pots and pans',
    caption: 'Housework is invisible until you write it down together.',
  },
  'couple-grill': {
    file: 'File:Cooking Onions (Unsplash).jpg',
    alt: 'A person cooking over a large grill with steam rising',
    caption: 'Splitting the work fairly starts with naming the work.',
  },
  'breakfast-bed': {
    file: 'File:Breakfast in bed (Unsplash).jpg',
    alt: 'A breakfast tray with orange juice beside someone sitting up in bed',
    caption: 'The first ten minutes of a day set the tone for the other fourteen hours.',
  },
  'pancakes': {
    file: 'File:Breakfast table with pancakes (Unsplash).jpg',
    alt: 'A breakfast table with pancakes, coffee, and shared plates',
    caption: 'A tiny repeated habit is cheaper than a grand weekend away.',
  },
  'balcony-plants': {
    file: 'File:Balcony in Kyiv (Unsplash).jpg',
    alt: 'A small balcony filled with potted plants and a coffee cup',
    caption: 'Small rituals at home are the ones that stick.',
  },
  'locket-book': {
    file: 'File:Locket on open book (Unsplash).jpg',
    alt: 'An ornate locket resting on an open book',
    caption: 'Privacy is not secrecy — it is room to be a whole person.',
  },
  'cozy-reading': {
    file: 'File:Getting cozy with a book (Unsplash).jpg',
    alt: 'Someone reading a book under a knitted blanket',
    caption: 'Some parts of a life are worth keeping quietly your own.',
  },
};

// slug -> { cover, body }. Cover images are unique per post; body images may
// repeat across same-topic articles (they are rarely seen side by side).
const POSTS = {
  'are-we-compatible-quiz': { cover: 'inked-couple', body: 'hands-wall' },
  'best-budget-friendly-date-20261016-companion': { cover: 'picnic-basket', body: 'eating-together' },
  'best-gift-couple-can-give-20261023-companion': { cover: 'gift-tags', body: 'gift-parcel' },
  'best-rainy-day-date-20261001-companion': { cover: 'rainy-umbrella', body: 'rain-window' },
  'best-surprise-date-idea-20261004-companion': { cover: 'tulips-love', body: 'gift-parcel' },
  'best-way-end-perfect-date-20261002-companion': { cover: 'restaurant-dusk', body: 'steak-dinner' },
  'best-way-say-sorry-after-20261013-companion': { cover: 'embrace-doorway', body: 'hands-back' },
  'best-way-say-sorry-after-20261021-companion': { cover: 'hug-winter', body: 'forehead-kiss' },
  'best-way-support-stressed-partner-20261019-companion': { cover: 'forehead-kiss', body: 'coffee-hands-table' },
  'compatibility-quiz-for-long-term-couples': { cover: 'elderly-hands', body: 'rings-hands' },
  'compatibility-quiz-for-new-couples': { cover: 'young-love', body: 'coffee-cups-ground' },
  'couple-bonding-activities-at-home': { cover: 'home-work', body: 'kitchen-table' },
  'couple-talk-about-future-20261021-companion': { cover: 'hill-sunset', body: 'coastal-love' },
  'couples-communication-exercises': { cover: 'coffee-hands-table', body: 'chairs-table' },
  'couples-handle-different-love-languages-20261002-companion': { cover: 'hands-golden-gate', body: 'heart-hands' },
  'couples-handle-holiday-season-together-20261030-companion': { cover: 'christmas-flatlay', body: 'christmas-cookies' },
  'couples-keep-some-things-private-20261026-companion': { cover: 'locket-book', body: 'cozy-reading' },
  'couples-split-household-responsibilities-20261016-companion': { cover: 'chores-pots', body: 'couple-grill' },
  'favorite-way-start-day-couple-20261001-companion': { cover: 'breakfast-bed', body: 'pancakes' },
  'galentines-day-ideas-self-love': { cover: 'coffee-toast', body: 'friends-diner' },
  'hardest-part-long-distance-relationship-20261030-companion': { cover: 'phone-sunset', body: 'laptop-mug' },
  'helps-feel-understood-without-explaining-20261023-companion': { cover: 'couple-field-golden', body: 'couple-blanket' },
  'keep-friendships-alive-while-relationship-20261018-companion': { cover: 'friends-outdoors', body: 'friends-diner' },
  'keep-friendships-alive-while-relationship-20261020-companion': { cover: 'brunch-overhead', body: 'group-burgers' },
  'keeps-spark-alive-long-relationship-20261004-companion': { cover: 'love-sparkler', body: 'couple-silhouette-tree' },
  'keeps-spark-alive-long-relationship-20261019-companion': { cover: 'wine-hands', body: 'wine-bar' },
  'makes-date-night-feel-like-20261028-companion': { cover: 'dinner-wine-closeup', body: 'bistro-table' },
  'makes-difficult-conversation-feel-safe-20261028-companion': { cover: 'couple-walking-street', body: 'chairs-table' },
  'makes-feel-most-appreciated-relationship-20261014-companion': { cover: 'writing-note', body: 'journal-writing' },
  'makes-meeting-family-less-stressful-20261020-companion': { cover: 'eating-together', body: 'family-bench' },
  'makes-relationship-feel-equal-20261017-companion': { cover: 'feet-grass', body: 'walking-hands' },
  'matters-most-anniversary-20261026-companion': { cover: 'wedding-cliff', body: 'rings-hands' },
  'often-couples-have-date-night-20261014-companion': { cover: 'calendar', body: 'notebook-coffee' },
  'partner-reconnect-after-hard-day-20261001-companion': { cover: 'couch-couple', body: 'hands-back' },
  'perfect-home-date-night-20261011-companion': { cover: 'wine-bar', body: 'dinner-wine-closeup' },
  'phones-be-banned-date-night-20261015-companion': { cover: 'devices-couch', body: 'payphones' },
  'phones-be-banned-date-night-20261018-companion': { cover: 'phone-beach', body: 'woman-phone' },
  'quality-time-mean-20261011-companion': { cover: 'couple-beach-wide', body: 'couple-backpacks' },
  'relationship-compatibility-guide': { cover: 'couple-paradise', body: 'walking-hands' },
  'relationship-compatibility-questions-quiz': { cover: 'journaling-coffee', body: 'letters-tiles' },
  'relationship-compatibility-quiz': { cover: 'silhouette-beach', body: 'coffee-hands-table' },
  'small-habit-keeps-couple-feeling-20261015-companion': { cover: 'balcony-plants', body: 'pancakes' },
  'valentines-day-date-ideas-at-home': { cover: 'bouquet', body: 'cozy-reading' },
  'who-plan-next-date-20261001-companion': { cover: 'notebook-coffee', body: 'chairs-table' },
  'who-plan-next-date-20261017-companion': { cover: 'chairs-table', body: 'calendar' },
  'why-modern-dating-feels-so-hard': { cover: 'coffee-cups-ground', body: 'woman-phone' },
};

// Fallback pools for posts that are not curated above (new articles generated by
// scripts/daily_polls.py). The pool is chosen from the post's `section`, so a
// brand-new article still ships a relevant cover + body image on its first run
// instead of failing the build. Curated POSTS entries always win.
const SECTION_POOLS = {
  'Compatibility': ['hands-wall', 'silhouette-beach', 'young-love', 'couple-paradise', 'elderly-hands'],
  'Date night': ['bistro-table', 'cozy-sofa', 'wine-bar', 'restaurant-dusk', 'picnic-basket'],
  'Connection': ['coffee-hands-table', 'forehead-kiss', 'hands-back', 'couple-blanket', 'heart-hands'],
  'Relationships': ['walking-hands', 'feet-grass', 'home-work', 'couple-backpacks', 'beach-sunset'],
  'Couple Bonding': ['kitchen-table', 'cozy-sofa', 'cozy-reading', 'pancakes'],
  'Communication': ['chairs-table', 'notebook-coffee', 'writing-note', 'coffee-hands-table'],
  'Seasonal': ['christmas-flatlay', 'gift-tags', 'bouquet', 'rings-hands'],
  'Friendship': ['coffee-toast', 'brunch-overhead', 'friends-diner', 'best-friends', 'group-burgers'],
  "Valentine's Day": ['bouquet', 'tulips-love', 'gift-tags', 'heart-hands'],
  'Dating': ['coffee-cups-ground', 'woman-phone', 'phone-beach', 'young-love'],
  'default': ['inked-couple', 'hands-wall', 'couch-couple', 'coffee-hands-table', 'laptop-mug'],
};

// Stable hash so a given slug always lands on the same fallback image.
function hashSlug(slug) {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) % 100003;
  return hash;
}

function resolvePick(slug, section) {
  if (POSTS[slug]) return POSTS[slug];
  const pool = SECTION_POOLS[section] || SECTION_POOLS.default;
  const seed = hashSlug(slug);
  const cover = pool[seed % pool.length];
  const body = pool[(seed + 1 + (seed % (pool.length - 1))) % pool.length];
  return { cover, body: body === cover ? pool[(seed + 2) % pool.length] : body };
}

const BODY_START = '<!-- cib:body-image:start -->';
const BODY_END = '<!-- cib:body-image:end -->';

const escapeHtml = (value = '') => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const stripTags = (value = '') => value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

async function commonsInfo(titles) {
  const info = new Map();
  for (let i = 0; i < titles.length; i += 20) {
    const batch = titles.slice(i, i + 20);
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      titles: batch.join('|'),
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: '2200',
    });
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`Commons API ${res.status} for ${batch[0]}`);
    const data = await res.json();
    for (const page of Object.values(data.query?.pages || {})) {
      if (!page.imageinfo) continue;
      const ii = page.imageinfo[0];
      const em = ii.extmetadata || {};
      info.set(page.title, {
        thumb: ii.thumburl,
        page: ii.descriptionurl,
        artist: stripTags(em.Artist?.value || '') || 'Unsplash contributor',
        license: em.LicenseShortName?.value || 'CC0',
      });
    }
  }
  return info;
}

async function writeDerivatives(key, entry, meta, force) {
  const coverPath = path.join(outDir, `${key}-cover.jpg`);
  const bodyPath = path.join(outDir, `${key}-body.jpg`);
  if (!force && fs.existsSync(coverPath) && fs.existsSync(bodyPath)) return;
  const res = await fetch(meta.thumb, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`download failed ${res.status}: ${entry.file}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await sharp(buffer).resize(1200, 675, { fit: 'cover', position: sharp.strategy.attention })
    .jpeg({ quality: 76, mozjpeg: true }).toFile(coverPath);
  await sharp(buffer).resize(1200, 800, { fit: 'cover', position: sharp.strategy.attention })
    .jpeg({ quality: 76, mozjpeg: true }).toFile(bodyPath);
}

function creditLine(credit, creditUrl) {
  return creditUrl
    ? `Photo: <a href="${escapeHtml(creditUrl)}" rel="noopener noreferrer" target="_blank">${escapeHtml(credit)}</a> · free licence`
    : `Photo: ${escapeHtml(credit)} · free licence`;
}

function bodyFigure(key, entry) {
  return [
    BODY_START,
    `<figure class="article-figure"><img src="/assets/blog/${key}-body.jpg" alt="${escapeHtml(entry.alt)}" width="1200" height="800" loading="lazy" decoding="async"><figcaption>${escapeHtml(entry.caption || '')} ${creditLine(entry.credit, entry.creditUrl)}</figcaption></figure>`,
    BODY_END,
  ].join('\n');
}

function patchFrontmatter(text, { coverImage, alt, credit, creditUrl }) {
  const block = [
    `coverImage: "${coverImage}"`,
    `coverImageAlt: "${alt.replace(/"/g, "'")}"`,
    `coverImageCredit: "${credit.replace(/"/g, "'")}"`,
    `coverImageCreditUrl: "${creditUrl}"`,
  ].join('\n') + '\n';
  const withoutOld = text.replace(/^coverImage(Alt|Credit|CreditUrl)?:.*\r?\n/gm, '');
  const slugMatch = withoutOld.match(/^slug:.*\r?\n/m);
  if (!slugMatch) throw new Error('frontmatter has no slug: line');
  const at = slugMatch.index + slugMatch[0].length;
  return withoutOld.slice(0, at) + block + withoutOld.slice(at);
}

function insertBodyImage(body, figureText) {
  const start = body.indexOf(BODY_START);
  if (start !== -1) {
    const end = body.indexOf(BODY_END);
    if (end === -1) throw new Error('unterminated body-image marker');
    return body.slice(0, start) + figureText + body.slice(end + BODY_END.length);
  }
  const h2 = body.indexOf('</h2>');
  const afterHeading = h2 === -1 ? -1 : body.indexOf('</p>', h2);
  const anchor = afterHeading !== -1 ? afterHeading : body.indexOf('</p>');
  if (anchor === -1) throw new Error('body has no paragraph to anchor the image to');
  const at = anchor + '</p>'.length;
  return `${body.slice(0, at)}\n\n${figureText}\n${body.slice(at)}`;
}

function splitPost(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error('missing frontmatter fence');
  return { frontmatter: match[1], body: match[2] };
}

function audit(posts, { requireApplied = false } = {}) {
  const problems = [];
  const coverUse = new Map();
  for (const [slug, pick] of Object.entries(POSTS)) {
    if (coverUse.has(pick.cover)) problems.push(`cover "${pick.cover}" used by both ${coverUse.get(pick.cover)} and ${slug}`);
    coverUse.set(pick.cover, slug);
    for (const key of [pick.cover, pick.body]) {
      if (!CATALOG[key]) problems.push(`${slug}: unknown image key "${key}"`);
    }
  }
  const slugs = posts.map((name) => name.replace(/\.md$/, ''));
  for (const slug of Object.keys(POSTS)) {
    if (!slugs.includes(slug)) problems.push(`mapping entry without a post: ${slug}`);
  }
  for (const slug of slugs) {
    const { frontmatter, body } = splitPost(fs.readFileSync(path.join(blogDir, `${slug}.md`), 'utf8'));
    const pick = resolvePick(slug, sectionOf(frontmatter));
    for (const key of [pick.cover, pick.body]) {
      if (!CATALOG[key]) problems.push(`${slug}: unknown image key "${key}"`);
    }
    if (requireApplied) {
      if (!/^coverImage: /m.test(frontmatter)) problems.push(`${slug}: frontmatter is missing coverImage`);
      if (!body.includes(BODY_START)) problems.push(`${slug}: body is missing the image figure`);
    }
  }
  return problems;
}

function sectionOf(frontmatter) {
  const match = frontmatter.match(/^section:\s*"?([^"\r\n]*)"?\s*$/m);
  return match ? match[1].trim() : '';
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const force = args.has('--force');
  const checkOnly = args.has('--check');
  const posts = fs.readdirSync(blogDir).filter((name) => name.endsWith('.md')).sort();

  if (checkOnly) {
    const problems = audit(posts, { requireApplied: true });
    for (const key of Object.keys(CATALOG)) {
      for (const suffix of ['cover', 'body']) {
        const file = path.join(outDir, `${key}-${suffix}.jpg`);
        if (!fs.existsSync(file)) problems.push(`missing asset ${path.relative(rootDir, file)}`);
      }
    }
    if (problems.length) {
      console.error(problems.join('\n'));
      process.exit(1);
    }
    console.log(`OK: ${posts.length} posts illustrated, ${Object.keys(CATALOG).length} image pairs present.`);
    return;
  }

  const problems = audit(posts);
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const info = await commonsInfo(Object.values(CATALOG).map((entry) => entry.file));
  for (const [key, entry] of Object.entries(CATALOG)) {
    const meta = info.get(entry.file);
    if (!meta) throw new Error(`Commons returned no imageinfo for ${entry.file}`);
    await writeDerivatives(key, entry, meta, force);
    CATALOG[key] = { ...entry, credit: meta.artist, creditUrl: meta.page, license: meta.license };
    process.stdout.write('.');
  }
  console.log(`\nImages ready in ${path.relative(rootDir, outDir)}`);

  let patched = 0;
  for (const slug of posts.map((name) => name.replace(/\.md$/, ''))) {
    const file = path.join(blogDir, `${slug}.md`);
    const { frontmatter, body } = splitPost(fs.readFileSync(file, 'utf8'));
    const pick = resolvePick(slug, sectionOf(frontmatter));
    const cover = CATALOG[pick.cover];
    const bodyImage = CATALOG[pick.body];
    const nextFrontmatter = patchFrontmatter(frontmatter, {
      coverImage: `/assets/blog/${pick.cover}-cover.jpg`,
      alt: cover.alt,
      credit: cover.credit,
      creditUrl: cover.creditUrl,
    });
    const nextBody = insertBodyImage(body, bodyFigure(pick.body, bodyImage));
    fs.writeFileSync(file, `---\n${nextFrontmatter}\n---\n${nextBody}`);
    patched += 1;
  }
  console.log(`Illustrated ${patched} posts (${Object.keys(POSTS).length} curated, ${patched - Object.keys(POSTS).length} section fallbacks).`);
}

if (process.argv[1] === __filename) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}





