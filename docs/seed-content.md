# Mulaqat — Seed Content (Quiz v1 + Game Decks v1)

> This file is **data, not suggestions**. Load it verbatim into the Prisma seed (`quiz_questions`, `decks`, `deck_cards`) and the AI document store (deck corpus for RAG). Locale `en` unless marked `hinglish`. All content is safety-reviewed (`safety_reviewed=true`).

---

## 1. Personality Quiz (version: `v1`, ~5 minutes, 15 questions)

Traits (all normalized to [-1, +1]):
- **energy**: −1 quiet recharger ↔ +1 crowd-charger
- **depth**: −1 keep-it-light ↔ +1 go-deep-fast
- **novelty**: −1 comfort-zone ↔ +1 wildcard
- **structure**: −1 spontaneous ↔ +1 planner

Plus collected facets: `humor_styles[]`, `interests[]`, `languages[]`, `dietary`, `relationship_intent`.

Format: `kind` ∈ single | multi | slider | either_or. Option `trait_weights` are summed then normalized per trait by the profiler.

### Q1 — single · energy
**It's 7 PM on a Friday. Your ideal evening is…**
- 🎉 "Somewhere loud with people I haven't met yet" → `{energy:+1.0, novelty:+0.4}`
- 🍻 "Small group, long dinner, endless conversation" → `{energy:+0.3, depth:+0.4}`
- 🎬 "One close friend, good food, no agenda" → `{energy:-0.5}`
- 🛋️ "Me, my couch, and zero human interaction" → `{energy:-1.0}`

### Q2 — single · energy
**At a party where you know nobody, you…**
- 🕺 "Introduce myself to the most interesting-looking group" → `{energy:+1.0}`
- 🍹 "Find the kitchen — that's where conversations happen" → `{energy:+0.4, depth:+0.2}`
- 🐶 "Locate the host's pet and befriend it" → `{energy:-0.4, humor:goofy}`
- 🚪 "Calculate the earliest polite exit time" → `{energy:-0.9}`

### Q3 — slider · depth
**How fast do you like conversations to get real?**
Left: "Weather and cricket scores are fine" (−1) · Right: "Tell me your childhood dreams in the first 10 minutes" (+1)

### Q4 — single · depth
**Someone at dinner asks, "So… what do you think happens after we die?" You think:**
- 🤩 "FINALLY. A real question." → `{depth:+1.0}`
- 🤔 "Interesting — after some wine, sure" → `{depth:+0.4}`
- 😅 "Can we get through starters first?" → `{depth:-0.3}`
- 🏃 "New topic please. Anyone seen any good memes?" → `{depth:-0.9}`

### Q5 — single · novelty
**Your friend suggests a restaurant with a cuisine you can't pronounce. You:**
- 🌍 "Book it. Weird menu = best night" → `{novelty:+1.0}`
- 🙂 "Sure, as long as reviews are decent" → `{novelty:+0.3}`
- 🤨 "I'll come, but I'm ordering the safest thing" → `{novelty:-0.4}`
- 🍛 "Counter-offer: the place we always go" → `{novelty:-1.0}`

### Q6 — either_or · novelty
**Pick one:** 🗺️ "Trip with no itinerary" `{novelty:+0.8, structure:-0.6}` vs 📋 "Trip planned to the hour" `{novelty:-0.5, structure:+0.9}`

### Q7 — slider · structure
**Your weekends are…**
Left: "Decided at the moment, vibes only" (−1) · Right: "Color-coded calendar since Tuesday" (+1)

### Q8 — single · humor_styles (multi-weight)
**What actually makes you laugh?**
- 🃏 "Absurd, silly, no-logic humor" → `humor:goofy`
- 🧊 "Deadpan one-liners delivered with a straight face" → `humor:dry`
- 👀 "Painfully accurate observations about daily life" → `humor:observational`
- 🎭 "Wordplay, puns, the groan-worthy stuff" → `humor:punny`

### Q9 — multi (max 2) · humor_styles
**Your group chat role is…**
- 📸 "Meme supplier" → `humor:observational`
- 🎙️ "Voice-note monologuer" → `{energy:+0.3}`, `humor:goofy`
- 🧾 "The one who replies 'lol' three days later" → `{energy:-0.3}`, `humor:dry`
- 🔗 "Sender of long articles nobody reads" → `{depth:+0.4}`

### Q10 — multi (pick 3–6) · interests
**Pick what you could talk about for an hour straight:**
Food & cooking · Cricket/sports · Films & series · Music & gigs · Startups & tech · Books · Travel · Fitness & running · Art & design · Gaming · Psychology & people · Finance & investing · Comedy & standup · Spirituality · Fashion · Photography

### Q11 — single · dietary (facet)
**Food identity:** Veg 🌱 · Non-veg 🍗 · Jain 🙏 · Vegan 🥦 · Eggetarian 🍳
*(Used for table composition + venue routing — not a personality trait.)*

### Q12 — multi · languages (facet)
**Languages you're comfortable hanging out in:** English · Hindi · Hinglish obviously · Kannada · Tamil · Telugu · Marathi · Bengali · Malayalam · Punjabi · Gujarati

### Q13 — single · relationship_intent (facet, phrased gently)
**What brings you here?**
- 🤝 "New friends. That's it, that's the tweet" → `friends_only`
- ✨ "Friends first — but if something clicks, I'm open" → `open_to_dating`
*(Never shown to other users. Powers Spark eligibility only.)*

### Q14 — single · energy+depth combo
**The best compliment someone could give you after a dinner:**
- 🔥 "You made the whole table come alive" → `{energy:+0.8}`
- 🧠 "That conversation changed how I think" → `{depth:+0.8}`
- 😂 "I haven't laughed like that in months" → `humor:goofy, {energy:+0.3}`
- 🫶 "You made everyone feel included" → `{energy:+0.1, depth:+0.3}`

### Q15 — either_or · fun closer (low weight, great share-card fodder)
**Final question, most important one:** ☕ "Chai" `{tag:chai}` vs ☕ "Coffee" `{tag:coffee}` — *"Choose carefully. Tables have been divided over less."*

---

## 2. Archetypes (energy × depth × novelty grid → 8 cards)

| Archetype | Emoji | Condition (after normalize) | Card blurb (template fallback) |
|---|---|---|---|
| Warm Firecracker | 🔥 | energy ≥ 0.3, depth ≥ 0.3 | "You light up rooms AND go deep. Dangerous combination. Tables fight over you." |
| Social Alchemist | ✨ | energy ≥ 0.3, depth < 0.3, novelty ≥ 0 | "You turn six strangers into a group chat. It's basically a superpower." |
| Playful Spark | 🎈 | energy ≥ 0.3, depth < 0.3, novelty < 0 | "You keep it light, keep it fun, and somehow know everyone's name by round two." |
| Cozy Philosopher | 🍵 | energy < 0.3, depth ≥ 0.3, novelty < 0 | "Quiet until the conversation gets real — then nobody can keep up with you." |
| Curious Wanderer | 🧭 | energy < 0.3, depth ≥ 0.3, novelty ≥ 0 | "You ask the questions nobody expects and order the dish nobody can pronounce." |
| Steady Anchor | ⚓ | energy < 0.3, depth < 0.3, structure ≥ 0.3 | "Every great table needs one person holding it together. Hi, it's you." |
| Gentle Rebel | 🌊 | energy < 0.3, depth < 0.3, novelty ≥ 0.3 | "Low-key on the surface, plot twist underneath. People underestimate you exactly once." |
| Quiet Observer | 🌙 | everything else | "You notice everything, say the perfect thing at the perfect time, and win the whole table." |

Share card = archetype + emoji + 2-line blurb (LLM-personalized when configured) + "mulaqat" watermark + user first name. Instagram-story sized (1080×1920) via the OG image endpoint.

---

## 3. Ice-breaker Deck — Level 1 · Light (`icebreaker`, level 1, en)

1. What's your most controversial food opinion? Defend it.
2. What's the most Bangalore/Mumbai/Delhi thing that's happened to you this month?
3. You get one superpower but it's slightly useless. What do you pick?
4. What's a movie everyone loves that you just… don't get?
5. What was your last 5-star and last 1-star auto/cab ride story?
6. If your personality were a Maggi topping, what would it be?
7. What's the weirdest thing in your search history you're willing to admit?
8. Which app on your phone would embarrass you the most if we opened it right now?
9. What's your go-to karaoke song, even if you'd never actually sing it?
10. Describe your cooking skills as a movie title.
11. What's something you were weirdly good at as a kid?
12. Chai or coffee — and what does your answer say about you as a person?

## 4. Ice-breaker Deck — Level 2 · Personal (`icebreaker`, level 2, en)

1. What's something you moved cities for — and was it worth it?
2. What do you miss most about the place you grew up?
3. What's a compliment you received years ago that you still think about?
4. What's your "I can talk about this for an hour" topic — go for 2 minutes.
5. What friendship habit do you wish adults kept from school days?
6. What's the best piece of advice you've ignored?
7. Whose life in this city do you low-key envy, and why?
8. What's something you've changed your mind about in the last few years?
9. What did your parents get surprisingly right?
10. What's a small ritual that keeps you sane on bad weeks?

## 5. Ice-breaker Deck — Level 3 · Deep (`icebreaker`, level 3, en)

1. What's something you're still learning to forgive yourself for?
2. When did you last feel truly proud of yourself — not for others, for you?
3. What would 15-year-old you be most surprised about in your life today?
4. What's a fear you've outgrown, and one you haven't?
5. If work and money disappeared as factors tomorrow, what would you actually do?
6. What do people consistently misunderstand about you?
7. What's the loneliest you've ever felt in a city full of people?
8. What's one thing you wish someone had told you five years ago?
9. Who do you need to call more often, and what's stopping you?
10. What does "home" mean to you right now?

## 6. Hot Takes Deck (`hot_takes`, en/hinglish, vote A vs B then defend)

1. Chai > coffee. There is no debate. ☕
2. Biryani with elaichi surprise is a betrayal of trust. 🍚
3. Mumbai local trains build more character than any gym. 🚆
4. Bangalore weather is overrated — fight me. 🌦️
5. Paying ₹400 for filter coffee in a "minimalist café" is a personality disorder. 💸
6. Voice notes longer than 60 seconds should require written consent. 🎙️
7. Weddings are just networking events with better food. 💍
8. "Let's split equally" when you ordered a salad is daylight robbery. 🥗
9. Rewatching an old series beats starting a new one. Every time. 📺
10. Standup comedy shows are just group therapy with a cover charge. 🎤
11. Sunday brunch is a scam invented to ruin both breakfast AND lunch. 🥞
12. Naming your startup a misspelled English word should be a punishable offense. 🦄

## 7. Who's Most Likely To… Deck (`most_likely`, en — anonymous votes, counts revealed, never voters)

1. …accidentally become famous?
2. …ghost this group chat first?
3. …move abroad and develop an accent in 3 weeks?
4. …start a side hustle at this very table?
5. …cry at a random animal video today?
6. …survive longest without their phone?
7. …befriend the waiter by the end of dinner?
8. …show up 40 minutes late but with an amazing excuse?
9. …win a reality show — and which one?
10. …still be friends with all of us in 10 years?

## 8. Desi Trivia Deck (`trivia`, en — timed, team play)

| # | Question | Answer |
|---|---|---|
| 1 | Which film made "How's the josh?" a national greeting? | Uri: The Surgical Strike |
| 2 | Who hit six sixes in one over at the 2007 T20 World Cup? | Yuvraj Singh |
| 3 | "Mogambo khush hua" is from which film? | Mr. India |
| 4 | Maggi's famous (optimistic) cook-time claim? | 2 minutes |
| 5 | Who was the first host of Kaun Banega Crorepati? | Amitabh Bachchan |
| 6 | Which cricketer is called "Captain Cool"? | MS Dhoni |
| 7 | Shaktimaan's famously long-named alter ego — first two words? | Pandit Gangadhar |
| 8 | Which 90s drink taught India to say "I love you"? | Rasna |
| 9 | First Indian to win an individual Olympic gold? | Abhinav Bindra |
| 10 | In DDLJ's climax, the train scene happens at which fictional station's platform? *(accept: "the train scene / Raj extends his hand")* | Raj extends his hand from the train |
| 11 | Which city is called the City of Nizams? | Hyderabad |
| 12 | "Jugaad" roughly translates to…? | A clever/frugal hack or workaround |

## 9. Two Truths & a Lie (`two_truths`)

No seed cards — entries are collected per-attendee at booking (`bookings.two_truths`). Seed the **instruction card** only:
> "Time to find the liars at this table. Everyone's statements are about to appear one by one — vote for the lie, then watch faces carefully. 🕵️"

---

## 10. RAG corpus note

Every card above is also ingested into the AI document store as one document per card with metadata `{kind, level, locale, tags}` — this corpus anchors the style, safety level, and cultural register for all generated cards. Generated cards must be indistinguishable in quality from this seed set (that's what the generation eval judges).
