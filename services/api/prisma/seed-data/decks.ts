/**
 * Game decks v1 — loaded VERBATIM from docs/seed-content.md §3-9.
 * All seed content is safety-reviewed (safety_reviewed=true).
 */

export interface SeedDeck {
  key: string;
  kind: "icebreaker" | "hot_takes" | "most_likely" | "trivia" | "two_truths";
  locale: "en" | "hinglish";
  title: string;
  level: number | null;
  cards: { text: string; answer?: string }[];
}

export const decks: SeedDeck[] = [
  {
    key: "icebreaker-l1",
    kind: "icebreaker",
    locale: "en",
    title: "Ice-breakers — Level 1 · Light",
    level: 1,
    cards: [
      { text: "What's your most controversial food opinion? Defend it." },
      { text: "What's the most Bangalore/Mumbai/Delhi thing that's happened to you this month?" },
      { text: "You get one superpower but it's slightly useless. What do you pick?" },
      { text: "What's a movie everyone loves that you just… don't get?" },
      { text: "What was your last 5-star and last 1-star auto/cab ride story?" },
      { text: "If your personality were a Maggi topping, what would it be?" },
      { text: "What's the weirdest thing in your search history you're willing to admit?" },
      { text: "Which app on your phone would embarrass you the most if we opened it right now?" },
      { text: "What's your go-to karaoke song, even if you'd never actually sing it?" },
      { text: "Describe your cooking skills as a movie title." },
      { text: "What's something you were weirdly good at as a kid?" },
      { text: "Chai or coffee — and what does your answer say about you as a person?" },
    ],
  },
  {
    key: "icebreaker-l2",
    kind: "icebreaker",
    locale: "en",
    title: "Ice-breakers — Level 2 · Personal",
    level: 2,
    cards: [
      { text: "What's something you moved cities for — and was it worth it?" },
      { text: "What do you miss most about the place you grew up?" },
      { text: "What's a compliment you received years ago that you still think about?" },
      { text: "What's your \"I can talk about this for an hour\" topic — go for 2 minutes." },
      { text: "What friendship habit do you wish adults kept from school days?" },
      { text: "What's the best piece of advice you've ignored?" },
      { text: "Whose life in this city do you low-key envy, and why?" },
      { text: "What's something you've changed your mind about in the last few years?" },
      { text: "What did your parents get surprisingly right?" },
      { text: "What's a small ritual that keeps you sane on bad weeks?" },
    ],
  },
  {
    key: "icebreaker-l3",
    kind: "icebreaker",
    locale: "en",
    title: "Ice-breakers — Level 3 · Deep",
    level: 3,
    cards: [
      { text: "What's something you're still learning to forgive yourself for?" },
      { text: "When did you last feel truly proud of yourself — not for others, for you?" },
      { text: "What would 15-year-old you be most surprised about in your life today?" },
      { text: "What's a fear you've outgrown, and one you haven't?" },
      { text: "If work and money disappeared as factors tomorrow, what would you actually do?" },
      { text: "What do people consistently misunderstand about you?" },
      { text: "What's the loneliest you've ever felt in a city full of people?" },
      { text: "What's one thing you wish someone had told you five years ago?" },
      { text: "Who do you need to call more often, and what's stopping you?" },
      { text: "What does \"home\" mean to you right now?" },
    ],
  },
  {
    key: "hot-takes",
    kind: "hot_takes",
    locale: "hinglish",
    title: "Hot Takes",
    level: null,
    cards: [
      { text: "Chai > coffee. There is no debate. ☕" },
      { text: "Biryani with elaichi surprise is a betrayal of trust. 🍚" },
      { text: "Mumbai local trains build more character than any gym. 🚆" },
      { text: "Bangalore weather is overrated — fight me. 🌦️" },
      { text: "Paying ₹400 for filter coffee in a \"minimalist café\" is a personality disorder. 💸" },
      { text: "Voice notes longer than 60 seconds should require written consent. 🎙️" },
      { text: "Weddings are just networking events with better food. 💍" },
      { text: "\"Let's split equally\" when you ordered a salad is daylight robbery. 🥗" },
      { text: "Rewatching an old series beats starting a new one. Every time. 📺" },
      { text: "Standup comedy shows are just group therapy with a cover charge. 🎤" },
      { text: "Sunday brunch is a scam invented to ruin both breakfast AND lunch. 🥞" },
      { text: "Naming your startup a misspelled English word should be a punishable offense. 🦄" },
    ],
  },
  {
    key: "most-likely",
    kind: "most_likely",
    locale: "en",
    title: "Who's Most Likely To…",
    level: null,
    cards: [
      { text: "…accidentally become famous?" },
      { text: "…ghost this group chat first?" },
      { text: "…move abroad and develop an accent in 3 weeks?" },
      { text: "…start a side hustle at this very table?" },
      { text: "…cry at a random animal video today?" },
      { text: "…survive longest without their phone?" },
      { text: "…befriend the waiter by the end of dinner?" },
      { text: "…show up 40 minutes late but with an amazing excuse?" },
      { text: "…win a reality show — and which one?" },
      { text: "…still be friends with all of us in 10 years?" },
    ],
  },
  {
    key: "trivia-desi",
    kind: "trivia",
    locale: "en",
    title: "Desi Trivia",
    level: null,
    cards: [
      { text: "Which film made \"How's the josh?\" a national greeting?", answer: "Uri: The Surgical Strike" },
      { text: "Who hit six sixes in one over at the 2007 T20 World Cup?", answer: "Yuvraj Singh" },
      { text: "\"Mogambo khush hua\" is from which film?", answer: "Mr. India" },
      { text: "Maggi's famous (optimistic) cook-time claim?", answer: "2 minutes" },
      { text: "Who was the first host of Kaun Banega Crorepati?", answer: "Amitabh Bachchan" },
      { text: "Which cricketer is called \"Captain Cool\"?", answer: "MS Dhoni" },
      { text: "Shaktimaan's famously long-named alter ego — first two words?", answer: "Pandit Gangadhar" },
      { text: "Which 90s drink taught India to say \"I love you\"?", answer: "Rasna" },
      { text: "First Indian to win an individual Olympic gold?", answer: "Abhinav Bindra" },
      { text: "In DDLJ's climax, the train scene happens — what does Raj do?", answer: "Raj extends his hand from the train" },
      { text: "Which city is called the City of Nizams?", answer: "Hyderabad" },
      { text: "\"Jugaad\" roughly translates to…?", answer: "A clever/frugal hack or workaround" },
    ],
  },
  {
    key: "two-truths",
    kind: "two_truths",
    locale: "en",
    title: "Two Truths & a Lie",
    level: null,
    cards: [
      {
        text: "Time to find the liars at this table. Everyone's statements are about to appear one by one — vote for the lie, then watch faces carefully. 🕵️",
      },
    ],
  },
];
