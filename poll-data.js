window.COUPLE_POLL_DATA = [
  {
    id: "date-night-mood",
    topic: "date-night",
    label: "Date night",
    title: "What kind of date night sounds best this week?",
    description: "A quick date-night poll for couples deciding whether to stay in, go out, or make room for a little spontaneity.",
    intro: "Date night does not need to be elaborate to feel meaningful. This poll is a small prompt for noticing what kind of energy you both want this week.",
    related: ["connection-ritual", "weekly-ritual"],
    options: ["A cozy night at home", "An unplanned adventure", "A long dinner and good conversation", "A little of everything"]
  },
  {
    id: "connection-ritual",
    topic: "connection",
    label: "Connection",
    title: "What helps two people feel most connected?",
    description: "Vote on the everyday relationship habits that help couples feel close, understood, and emotionally present.",
    intro: "Connection can grow through grand gestures, but it is often shaped by ordinary moments. Use this poll to compare the small things that matter to you.",
    related: ["weekly-ritual", "date-night-mood"],
    options: ["Small acts of care", "Uninterrupted conversation", "Shared goals", "Laughing together"]
  },
  {
    id: "weekly-ritual",
    topic: "connection",
    label: "Connection",
    title: "What should a couple make time for this week?",
    description: "A weekly relationship poll about simple rituals that help couples slow down, reconnect, and enjoy time together.",
    intro: "A good weekly ritual is realistic enough to repeat and meaningful enough to look forward to. Choose the kind of moment your relationship could use this week.",
    related: ["connection-ritual", "date-night-mood"],
    options: ["A tech-free meal", "A walk with no agenda", "A shared creative project", "A sincere check-in"]
  },
  {
    id: "family-marriage-lasted-longer",
    topic: "relationships",
    label: "Relationships",
    title: "Do you believe family-arranged marriages last longer?",
    description: "Explore a thoughtful relationship question about family-arranged and love marriages without treating one path as universal.",
    intro: "Marriage outcomes are shaped by many factors, including communication, expectations, support, and choice. This poll is designed for reflection rather than a one-size-fits-all answer.",
    related: ["connection-ritual", "seasonal-mood"],
    options: ["Yes, family-arranged marriages can last longer", "No, love marriages can last longer", "It depends on the couple", "I’m not sure"]
  },
  {
    id: "seasonal-mood",
    topic: "seasonal",
    label: "Seasonal",
    title: "Which Valentine’s Day mood fits you best?",
    description: "Choose the Valentine’s Day style that feels most like you, from thoughtful and low-key to playful and spontaneous.",
    intro: "There is no single right way to celebrate affection. This seasonal poll is a light prompt for comparing the mood, pace, and company you want.",
    related: ["date-night-mood", "family-marriage-lasted-longer"],
    options: ["Thoughtful and low-key", "Playful and spontaneous", "Classic and romantic", "Friends-first celebration"]
  },
  {
    id: "sincere-apology", topic: "connection", label: "Connection",
    title: "What makes an apology feel sincere?",
    description: "Vote on the gestures that help an apology feel honest, accountable, and meaningful in a relationship.",
    intro: "A sincere apology is more than a quick phrase. This poll is a gentle prompt for noticing the words and actions that help trust grow after a difficult moment.",
    related: ["connection-ritual", "weekly-ritual"], options: ["Taking responsibility", "Listening without defending", "Following through with change", "Giving space, then reconnecting"]
  },
  {
    id: "weekend-reset", topic: "date-night", label: "Date night",
    title: "What kind of weekend reset would help your relationship?",
    description: "Choose the simple weekend reset that could help two people slow down, reconnect, and feel ready for the week ahead.",
    intro: "A reset does not need to be expensive or elaborate. Use this poll to compare the kind of time, rest, or attention your relationship could use next.",
    related: ["date-night-mood", "seasonal-mood"], options: ["A phone-free morning", "Cooking something together", "Getting outside for a walk", "Staying in and truly resting"]
  }
];

window.getCouplePoll = function (id) {
  return window.COUPLE_POLL_DATA.find((poll) => poll.id === id) || null;
};
