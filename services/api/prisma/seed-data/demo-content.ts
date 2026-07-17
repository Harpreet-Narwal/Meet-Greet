/**
 * M2 seed: 6 Bangalore venues, 8 events across types (2 in the past for
 * history testing), 30 quiz-completed users with varied traits (plan §5).
 * Deterministic — same data every run (seeded PRNG, fixed base date).
 */

export interface SeedVenue {
  slug: string;
  name: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  vibeTags: string[];
  priceBand: "low" | "mid" | "high";
  capacity: number;
}

export const venues: SeedVenue[] = [
  {
    slug: "toast-tonic-indiranagar",
    name: "Toast & Tonic",
    address: "14/1, Wood Street, Ashok Nagar",
    neighborhood: "Indiranagar",
    lat: 12.9719,
    lng: 77.6412,
    vibeTags: ["lively", "cocktails", "european"],
    priceBand: "high",
    capacity: 24,
  },
  {
    slug: "cafe-terra-koramangala",
    name: "Café Terra",
    address: "80 Feet Road, 4th Block",
    neighborhood: "Koramangala",
    lat: 12.9352,
    lng: 77.6245,
    vibeTags: ["cozy", "coffee", "all-day"],
    priceBand: "mid",
    capacity: 18,
  },
  {
    slug: "the-permit-room-mg-road",
    name: "The Permit Room",
    address: "Lavelle Road, Ashok Nagar",
    neighborhood: "MG Road",
    lat: 12.9698,
    lng: 77.5986,
    vibeTags: ["south-indian", "playful", "bar"],
    priceBand: "high",
    capacity: 30,
  },
  {
    slug: "dyu-art-cafe-koramangala",
    name: "Dyu Art Café",
    address: "5th Block, Koramangala",
    neighborhood: "Koramangala",
    lat: 12.9343,
    lng: 77.6186,
    vibeTags: ["quiet", "art", "kerala-house"],
    priceBand: "low",
    capacity: 16,
  },
  {
    slug: "cubbon-park-bandstand",
    name: "Cubbon Park Bandstand",
    address: "Kasturba Road entrance",
    neighborhood: "Cubbon Park",
    lat: 12.9763,
    lng: 77.5929,
    vibeTags: ["outdoors", "morning", "green"],
    priceBand: "low",
    capacity: 60,
  },
  {
    slug: "board-game-den-hsr",
    name: "The Board Game Den",
    address: "27th Main, HSR Layout Sector 1",
    neighborhood: "HSR Layout",
    lat: 12.9121,
    lng: 77.6446,
    vibeTags: ["games", "chai", "loud-laughter"],
    priceBand: "mid",
    capacity: 22,
  },
];

export interface SeedEvent {
  slug: string;
  title: string;
  description: string;
  type: "dinner" | "run_club" | "game_night" | "chai" | "trek";
  venueSlug: string;
  /** Days from the seed base date (negative = past). */
  daysFromNow: number;
  hour: number;
  durationMin: number;
  priceInr: number;
  capacity: number;
  budgetBand: "budget" | "moderate" | "premium";
  womenOnly: boolean;
  status: "published" | "completed";
  neighborhoodTeaser: string;
  tables: number;
}

export const events: SeedEvent[] = [
  {
    slug: "wednesday-dinner-indiranagar-w1",
    title: "Dinner for Six — Indiranagar",
    description:
      "The signature Wednesday table. Six strangers, one long dinner, ice-breakers on the table and zero pressure. Venue revealed 24 hours before — dress for a good time.",
    type: "dinner",
    venueSlug: "toast-tonic-indiranagar",
    daysFromNow: 3,
    hour: 20,
    durationMin: 150,
    priceInr: 399,
    capacity: 12,
    budgetBand: "premium",
    womenOnly: false,
    status: "published",
    neighborhoodTeaser: "Somewhere leafy in Indiranagar with cocktails worth the auto ride",
    tables: 2,
  },
  {
    slug: "saturday-dinner-mg-road-w1",
    title: "Dinner for Six — MG Road",
    description:
      "Saturday's table for the ones who bring the energy. Great food, better questions, and a table that votes on how deep the conversation goes.",
    type: "dinner",
    venueSlug: "the-permit-room-mg-road",
    daysFromNow: 6,
    hour: 20,
    durationMin: 150,
    priceInr: 449,
    capacity: 18,
    budgetBand: "premium",
    womenOnly: false,
    status: "published",
    neighborhoodTeaser: "Central, buzzing, and famous for its filter-coffee cocktails",
    tables: 3,
  },
  {
    slug: "women-only-dinner-koramangala-w1",
    title: "Women-only Table — Koramangala",
    description:
      "Six women, one unhurried dinner, a host who's got you. The safest way to meet your people in a new city — chai refills included.",
    type: "dinner",
    venueSlug: "cafe-terra-koramangala",
    daysFromNow: 4,
    hour: 19,
    durationMin: 120,
    priceInr: 349,
    capacity: 6,
    budgetBand: "moderate",
    womenOnly: true,
    status: "published",
    neighborhoodTeaser: "A cosy Koramangala café that takes its coffee very seriously",
    tables: 1,
  },
  {
    slug: "run-club-cubbon-sunday-w1",
    title: "Run Club Sundays — Cubbon Park",
    description:
      "5k at conversation pace, matched into pods of six by vibe, breakfast after for whoever sticks around. The cheapest therapy in town.",
    type: "run_club",
    venueSlug: "cubbon-park-bandstand",
    daysFromNow: 7,
    hour: 7,
    durationMin: 90,
    priceInr: 0,
    capacity: 30,
    budgetBand: "budget",
    womenOnly: false,
    status: "published",
    neighborhoodTeaser: "Bandstand side of the park, where the morning light hits right",
    tables: 5,
  },
  {
    slug: "game-night-hsr-w1",
    title: "Game Night — HSR Den",
    description:
      "Board games, loud laughter, and a trivia round that gets unreasonably competitive. Tables of six, matched so nobody's the odd one out.",
    type: "game_night",
    venueSlug: "board-game-den-hsr",
    daysFromNow: 5,
    hour: 19,
    durationMin: 150,
    priceInr: 199,
    capacity: 18,
    budgetBand: "moderate",
    womenOnly: false,
    status: "published",
    neighborhoodTeaser: "HSR's favourite den of dice and questionable strategy",
    tables: 3,
  },
  {
    slug: "chai-and-chill-dyu-w1",
    title: "Chai & Chill — Dyu Art Café",
    description:
      "One easy hour on a weekday evening. Six people, hot chai, one deck of very good questions. Zero commitment, full charm.",
    type: "chai",
    venueSlug: "dyu-art-cafe-koramangala",
    daysFromNow: 2,
    hour: 18,
    durationMin: 60,
    priceInr: 99,
    capacity: 12,
    budgetBand: "budget",
    womenOnly: false,
    status: "published",
    neighborhoodTeaser: "A 100-year-old Kerala house hiding in Koramangala",
    tables: 2,
  },
  {
    slug: "dinner-indiranagar-past-1",
    title: "Dinner for Six — Indiranagar (last week)",
    description: "A past table — kept for history, ratings and re-connect testing.",
    type: "dinner",
    venueSlug: "toast-tonic-indiranagar",
    daysFromNow: -6,
    hour: 20,
    durationMin: 150,
    priceInr: 399,
    capacity: 12,
    budgetBand: "premium",
    womenOnly: false,
    status: "completed",
    neighborhoodTeaser: "Somewhere leafy in Indiranagar",
    tables: 2,
  },
  {
    slug: "chai-koramangala-past-1",
    title: "Chai & Chill — Koramangala (last month)",
    description: "A past chai hour — kept for history testing.",
    type: "chai",
    venueSlug: "cafe-terra-koramangala",
    daysFromNow: -25,
    hour: 18,
    durationMin: 60,
    priceInr: 99,
    capacity: 12,
    budgetBand: "budget",
    womenOnly: false,
    status: "completed",
    neighborhoodTeaser: "A cosy Koramangala café",
    tables: 2,
  },
];

const FIRST_NAMES = [
  "Aarav", "Diya", "Vihaan", "Ananya", "Arjun", "Isha", "Kabir", "Meera", "Rohan", "Sara",
  "Advait", "Naina", "Dev", "Priya", "Kunal", "Tara", "Nikhil", "Zoya", "Aditya", "Rhea",
  "Farhan", "Anjali", "Siddharth", "Pooja", "Imran", "Lakshmi", "Varun", "Nandini", "Jai", "Simran",
];
const LAST_NAMES = [
  "Sharma", "Iyer", "Menon", "Gupta", "Reddy", "Khan", "Patel", "Nair", "Singh", "Das",
];
const INTEREST_POOL = [
  "Food & cooking", "Cricket/sports", "Films & series", "Music & gigs", "Startups & tech",
  "Books", "Travel", "Fitness & running", "Art & design", "Gaming", "Psychology & people",
  "Finance & investing", "Comedy & standup", "Spirituality", "Fashion", "Photography",
];
const LANGUAGE_POOL = ["English", "Hindi", "Hinglish obviously", "Kannada", "Tamil", "Telugu", "Marathi", "Bengali"];
const HUMOR_POOL = ["goofy", "dry", "observational", "punny"];
const DIETARY_POOL = ["veg", "nonveg", "nonveg", "eggetarian", "veg", "jain"] as const;
const ARCHETYPES: [string, string][] = [
  ["Warm Firecracker", "🔥"], ["Social Alchemist", "✨"], ["Playful Spark", "🎈"],
  ["Cozy Philosopher", "🍵"], ["Curious Wanderer", "🧭"], ["Steady Anchor", "⚓"],
  ["Gentle Rebel", "🌊"], ["Quiet Observer", "🌙"],
];

/** Deterministic LCG so the seed is identical on every run. */
function makeRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

export interface SeedUser {
  phone: string;
  fullName: string;
  firstName: string;
  gender: "woman" | "man" | "nonbinary";
  dobYear: number;
  dietary: (typeof DIETARY_POOL)[number];
  languages: string[];
  interests: string[];
  relationshipIntent: "friends_only" | "open_to_dating";
  traits: { energy: number; depth: number; novelty: number; structure: number };
  humorStyles: string[];
  archetype: string;
  archetypeEmoji: string;
}

export function buildSeedUsers(count = 30): SeedUser[] {
  const random = makeRandom(20260717);
  const pick = <T>(pool: readonly T[]): T => pool[Math.floor(random() * pool.length)] as T;
  const pickMany = <T>(pool: readonly T[], n: number): T[] => {
    const copy = [...pool];
    const out: T[] = [];
    for (let i = 0; i < n && copy.length > 0; i++) {
      out.push(copy.splice(Math.floor(random() * copy.length), 1)[0] as T);
    }
    return out;
  };
  const trait = () => Math.round((random() * 2 - 1) * 100) / 100;

  return Array.from({ length: count }, (_unused, index) => {
    const firstName = FIRST_NAMES[index % FIRST_NAMES.length] as string;
    const traits = { energy: trait(), depth: trait(), novelty: trait(), structure: trait() };
    const [archetype, emoji] = ARCHETYPES[index % ARCHETYPES.length] as [string, string];
    return {
      phone: `+9198${String(76000000 + index)}`,
      fullName: `${firstName} ${pick(LAST_NAMES)}`,
      firstName,
      gender: index % 2 === 0 ? "woman" : index % 7 === 3 ? "nonbinary" : "man",
      dobYear: 1992 + (index % 11),
      dietary: pick(DIETARY_POOL),
      languages: ["English", ...pickMany(LANGUAGE_POOL.slice(1), 1 + Math.floor(random() * 2))],
      interests: pickMany(INTEREST_POOL, 3 + Math.floor(random() * 3)),
      relationshipIntent: index % 3 === 0 ? "open_to_dating" : "friends_only",
      traits,
      humorStyles: pickMany(HUMOR_POOL, 1 + Math.floor(random() * 2)),
      archetype,
      archetypeEmoji: emoji,
    };
  });
}
