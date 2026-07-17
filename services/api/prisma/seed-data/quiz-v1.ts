/**
 * Personality Quiz v1 — loaded VERBATIM from docs/seed-content.md §1.
 * This file is data, not suggestions. trait_weights stay server-side.
 * Facet questions carry traitKey "facet:<field>" and write to the user profile.
 */
import type { QuestionKind } from "@prisma/client";

export interface SeedQuizOption {
  id: string;
  label: string;
  emoji?: string;
  trait_weights?: Record<string, number>;
  humor?: string;
  value?: string;
  tag?: string;
}

export interface SeedQuizQuestion {
  ord: number;
  kind: QuestionKind;
  text: string;
  subtext?: string;
  traitKey?: string;
  options: SeedQuizOption[];
}

export const QUIZ_VERSION = "v1";

export const quizQuestionsV1: SeedQuizQuestion[] = [
  {
    ord: 1,
    kind: "single",
    text: "It's 7 PM on a Friday. Your ideal evening is…",
    options: [
      { id: "a", emoji: "🎉", label: "Somewhere loud with people I haven't met yet", trait_weights: { energy: 1.0, novelty: 0.4 } },
      { id: "b", emoji: "🍻", label: "Small group, long dinner, endless conversation", trait_weights: { energy: 0.3, depth: 0.4 } },
      { id: "c", emoji: "🎬", label: "One close friend, good food, no agenda", trait_weights: { energy: -0.5 } },
      { id: "d", emoji: "🛋️", label: "Me, my couch, and zero human interaction", trait_weights: { energy: -1.0 } },
    ],
  },
  {
    ord: 2,
    kind: "single",
    text: "At a party where you know nobody, you…",
    options: [
      { id: "a", emoji: "🕺", label: "Introduce myself to the most interesting-looking group", trait_weights: { energy: 1.0 } },
      { id: "b", emoji: "🍹", label: "Find the kitchen — that's where conversations happen", trait_weights: { energy: 0.4, depth: 0.2 } },
      { id: "c", emoji: "🐶", label: "Locate the host's pet and befriend it", trait_weights: { energy: -0.4 }, humor: "goofy" },
      { id: "d", emoji: "🚪", label: "Calculate the earliest polite exit time", trait_weights: { energy: -0.9 } },
    ],
  },
  {
    ord: 3,
    kind: "slider",
    text: "How fast do you like conversations to get real?",
    traitKey: "depth",
    options: [
      { id: "left", label: "Weather and cricket scores are fine" },
      { id: "right", label: "Tell me your childhood dreams in the first 10 minutes" },
    ],
  },
  {
    ord: 4,
    kind: "single",
    text: "Someone at dinner asks, “So… what do you think happens after we die?” You think:",
    options: [
      { id: "a", emoji: "🤩", label: "FINALLY. A real question.", trait_weights: { depth: 1.0 } },
      { id: "b", emoji: "🤔", label: "Interesting — after some wine, sure", trait_weights: { depth: 0.4 } },
      { id: "c", emoji: "😅", label: "Can we get through starters first?", trait_weights: { depth: -0.3 } },
      { id: "d", emoji: "🏃", label: "New topic please. Anyone seen any good memes?", trait_weights: { depth: -0.9 } },
    ],
  },
  {
    ord: 5,
    kind: "single",
    text: "Your friend suggests a restaurant with a cuisine you can't pronounce. You:",
    options: [
      { id: "a", emoji: "🌍", label: "Book it. Weird menu = best night", trait_weights: { novelty: 1.0 } },
      { id: "b", emoji: "🙂", label: "Sure, as long as reviews are decent", trait_weights: { novelty: 0.3 } },
      { id: "c", emoji: "🤨", label: "I'll come, but I'm ordering the safest thing", trait_weights: { novelty: -0.4 } },
      { id: "d", emoji: "🍛", label: "Counter-offer: the place we always go", trait_weights: { novelty: -1.0 } },
    ],
  },
  {
    ord: 6,
    kind: "either_or",
    text: "Pick one:",
    options: [
      { id: "a", emoji: "🗺️", label: "Trip with no itinerary", trait_weights: { novelty: 0.8, structure: -0.6 } },
      { id: "b", emoji: "📋", label: "Trip planned to the hour", trait_weights: { novelty: -0.5, structure: 0.9 } },
    ],
  },
  {
    ord: 7,
    kind: "slider",
    text: "Your weekends are…",
    traitKey: "structure",
    options: [
      { id: "left", label: "Decided at the moment, vibes only" },
      { id: "right", label: "Color-coded calendar since Tuesday" },
    ],
  },
  {
    ord: 8,
    kind: "single",
    text: "What actually makes you laugh?",
    options: [
      { id: "a", emoji: "🃏", label: "Absurd, silly, no-logic humor", humor: "goofy" },
      { id: "b", emoji: "🧊", label: "Deadpan one-liners delivered with a straight face", humor: "dry" },
      { id: "c", emoji: "👀", label: "Painfully accurate observations about daily life", humor: "observational" },
      { id: "d", emoji: "🎭", label: "Wordplay, puns, the groan-worthy stuff", humor: "punny" },
    ],
  },
  {
    ord: 9,
    kind: "multi",
    text: "Your group chat role is…",
    subtext: "Pick up to 2",
    options: [
      { id: "a", emoji: "📸", label: "Meme supplier", humor: "observational" },
      { id: "b", emoji: "🎙️", label: "Voice-note monologuer", trait_weights: { energy: 0.3 }, humor: "goofy" },
      { id: "c", emoji: "🧾", label: "The one who replies 'lol' three days later", trait_weights: { energy: -0.3 }, humor: "dry" },
      { id: "d", emoji: "🔗", label: "Sender of long articles nobody reads", trait_weights: { depth: 0.4 } },
    ],
  },
  {
    ord: 10,
    kind: "multi",
    text: "Pick what you could talk about for an hour straight:",
    subtext: "Pick 3–6",
    traitKey: "facet:interests",
    options: [
      { id: "food", label: "Food & cooking" },
      { id: "cricket", label: "Cricket/sports" },
      { id: "films", label: "Films & series" },
      { id: "music", label: "Music & gigs" },
      { id: "startups", label: "Startups & tech" },
      { id: "books", label: "Books" },
      { id: "travel", label: "Travel" },
      { id: "fitness", label: "Fitness & running" },
      { id: "art", label: "Art & design" },
      { id: "gaming", label: "Gaming" },
      { id: "psychology", label: "Psychology & people" },
      { id: "finance", label: "Finance & investing" },
      { id: "comedy", label: "Comedy & standup" },
      { id: "spirituality", label: "Spirituality" },
      { id: "fashion", label: "Fashion" },
      { id: "photography", label: "Photography" },
    ],
  },
  {
    ord: 11,
    kind: "single",
    text: "Food identity:",
    subtext: "Used for table composition + venue routing — not a personality trait.",
    traitKey: "facet:dietary",
    options: [
      { id: "veg", emoji: "🌱", label: "Veg", value: "veg" },
      { id: "nonveg", emoji: "🍗", label: "Non-veg", value: "nonveg" },
      { id: "jain", emoji: "🙏", label: "Jain", value: "jain" },
      { id: "vegan", emoji: "🥦", label: "Vegan", value: "vegan" },
      { id: "egg", emoji: "🍳", label: "Eggetarian", value: "eggetarian" },
    ],
  },
  {
    ord: 12,
    kind: "multi",
    text: "Languages you're comfortable hanging out in:",
    traitKey: "facet:languages",
    options: [
      { id: "en", label: "English" },
      { id: "hi", label: "Hindi" },
      { id: "hinglish", label: "Hinglish obviously" },
      { id: "kn", label: "Kannada" },
      { id: "ta", label: "Tamil" },
      { id: "te", label: "Telugu" },
      { id: "mr", label: "Marathi" },
      { id: "bn", label: "Bengali" },
      { id: "ml", label: "Malayalam" },
      { id: "pa", label: "Punjabi" },
      { id: "gu", label: "Gujarati" },
    ],
  },
  {
    ord: 13,
    kind: "single",
    text: "What brings you here?",
    subtext: "Never shown to other users. Powers Spark eligibility only.",
    traitKey: "facet:relationship_intent",
    options: [
      { id: "friends", emoji: "🤝", label: "New friends. That's it, that's the tweet", value: "friends_only" },
      { id: "open", emoji: "✨", label: "Friends first — but if something clicks, I'm open", value: "open_to_dating" },
    ],
  },
  {
    ord: 14,
    kind: "single",
    text: "The best compliment someone could give you after a dinner:",
    options: [
      { id: "a", emoji: "🔥", label: "You made the whole table come alive", trait_weights: { energy: 0.8 } },
      { id: "b", emoji: "🧠", label: "That conversation changed how I think", trait_weights: { depth: 0.8 } },
      { id: "c", emoji: "😂", label: "I haven't laughed like that in months", trait_weights: { energy: 0.3 }, humor: "goofy" },
      { id: "d", emoji: "🫶", label: "You made everyone feel included", trait_weights: { energy: 0.1, depth: 0.3 } },
    ],
  },
  {
    ord: 15,
    kind: "either_or",
    text: "Final question, most important one:",
    subtext: "Choose carefully. Tables have been divided over less.",
    options: [
      { id: "chai", emoji: "☕", label: "Chai", tag: "chai" },
      { id: "coffee", emoji: "☕", label: "Coffee", tag: "coffee" },
    ],
  },
];
