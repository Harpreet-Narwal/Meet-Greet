"""RAG corpus — the seed deck cards (docs/seed-content.md §10: every seed card is
one document with metadata {kind, level, locale, tags}). This anchors the style,
safety level and cultural register for all generated cards.
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class CorpusCard:
    text: str
    kind: str
    locale: str = "en"
    level: int | None = None
    tags: list[str] = field(default_factory=list)

    @property
    def doc_id(self) -> str:
        return f"{self.kind}:{self.level or 0}:{abs(hash(self.text)) % 10_000_000}"


_ICEBREAKER_L1 = [
    "What's your most controversial food opinion? Defend it.",
    "What's the most Bangalore/Mumbai/Delhi thing that's happened to you this month?",
    "You get one superpower but it's slightly useless. What do you pick?",
    "What's a movie everyone loves that you just… don't get?",
    "What was your last 5-star and last 1-star auto/cab ride story?",
    "If your personality were a Maggi topping, what would it be?",
    "Which app on your phone would embarrass you the most if we opened it right now?",
    "What's your go-to karaoke song, even if you'd never actually sing it?",
    "Describe your cooking skills as a movie title.",
    "Chai or coffee — and what does your answer say about you as a person?",
]
_ICEBREAKER_L2 = [
    "What's something you moved cities for — and was it worth it?",
    "What do you miss most about the place you grew up?",
    "What's a compliment you received years ago that you still think about?",
    "What friendship habit do you wish adults kept from school days?",
    "What's the best piece of advice you've ignored?",
    "What's something you've changed your mind about in the last few years?",
    "What did your parents get surprisingly right?",
    "What's a small ritual that keeps you sane on bad weeks?",
]
_ICEBREAKER_L3 = [
    "What's something you're still learning to forgive yourself for?",
    "When did you last feel truly proud of yourself — not for others, for you?",
    "What would 15-year-old you be most surprised about in your life today?",
    "What's a fear you've outgrown, and one you haven't?",
    "If work and money disappeared as factors tomorrow, what would you actually do?",
    "What do people consistently misunderstand about you?",
    "What's one thing you wish someone had told you five years ago?",
    'What does "home" mean to you right now?',
]
_HOT_TAKES = [
    "Chai > coffee. There is no debate. ☕",
    "Biryani with elaichi surprise is a betrayal of trust. 🍚",
    "Mumbai local trains build more character than any gym. 🚆",
    "Bangalore weather is overrated — fight me. 🌦️",
    "Voice notes longer than 60 seconds should require written consent. 🎙️",
    "Weddings are just networking events with better food. 💍",
    "Rewatching an old series beats starting a new one. Every time. 📺",
    "Sunday brunch is a scam invented to ruin both breakfast AND lunch. 🥞",
]
_MOST_LIKELY = [
    "…accidentally become famous?",
    "…ghost this group chat first?",
    "…move abroad and develop an accent in 3 weeks?",
    "…start a side hustle at this very table?",
    "…befriend the waiter by the end of dinner?",
    "…show up 40 minutes late but with an amazing excuse?",
    "…still be friends with all of us in 10 years?",
]

SEED_CORPUS: list[CorpusCard] = [
    *[CorpusCard(t, "icebreaker", level=1, tags=["light"]) for t in _ICEBREAKER_L1],
    *[CorpusCard(t, "icebreaker", level=2, tags=["personal"]) for t in _ICEBREAKER_L2],
    *[CorpusCard(t, "icebreaker", level=3, tags=["deep"]) for t in _ICEBREAKER_L3],
    *[CorpusCard(t, "hot_takes", tags=["debate"]) for t in _HOT_TAKES],
    *[CorpusCard(t, "most_likely", tags=["playful"]) for t in _MOST_LIKELY],
]
