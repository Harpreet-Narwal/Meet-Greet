import type { BaseState, Card, DeckKind, GameEvent, Player } from "./types";

export * from "./types";

export function initialState(players: Player[]): BaseState {
  return {
    kind: "icebreaker",
    phase: "lobby",
    players,
    cards: [],
    cardIndex: 0,
    level: 1,
    scores: Object.fromEntries(players.map((p) => [p.user_id, 0])),
    votes: {},
    result: null,
    startedBy: "",
  };
}

function majority(count: number): number {
  return Math.floor(count / 2) + 1;
}

/** Kinds where players cast a vote per card (vs. discuss-and-advance). */
const VOTING_KINDS = new Set<DeckKind>(["hot_takes", "most_likely", "two_truths"]);

/**
 * The single reducer. Per-kind behaviour (plan §6):
 * - icebreaker: deal → discuss → advance; levelVote majority unlocks L2/L3
 * - hot_takes: prompt → vote A/B → reveal split → discuss
 * - most_likely: anonymous vote for a table-mate → reveal counts only (never who voted)
 * - two_truths: each attendee's entries → table guesses the lie → reveal
 * - trivia: timed rounds, table score
 */
export function reduce(state: BaseState, event: GameEvent): BaseState {
  switch (event.type) {
    case "start":
      return {
        ...state,
        kind: event.deckKind,
        phase: VOTING_KINDS.has(event.deckKind) ? "voting" : "card",
        cards: event.cards,
        cardIndex: 0,
        level: event.level ?? 1,
        votes: {},
        result: null,
        startedBy: event.startedBy,
      };

    case "advance": {
      const nextIndex = state.cardIndex + 1;
      if (nextIndex >= state.cards.length) {
        return { ...state, phase: "ended", votes: {}, result: null };
      }
      return {
        ...state,
        cardIndex: nextIndex,
        phase: VOTING_KINDS.has(state.kind) ? "voting" : "card",
        votes: {},
        result: null,
      };
    }

    case "vote": {
      if (state.phase !== "voting") return state;
      const votes = { ...state.votes, [event.userId]: event.choice };
      const everyoneVoted = state.players.every((p) => votes[p.user_id] !== undefined);
      if (!everyoneVoted) return { ...state, votes };
      return { ...state, votes, phase: "reveal", result: tallyVotes(state, votes) };
    }

    case "answer": {
      // trivia: first correct answer scores; simple exact-match (case-insensitive)
      if (state.phase !== "card") return state;
      const card = state.cards[state.cardIndex];
      const correct =
        card?.answer && event.answer.trim().toLowerCase() === card.answer.trim().toLowerCase();
      const votes = { ...state.votes, [event.userId]: event.answer };
      if (correct && state.result === null) {
        return {
          ...state,
          votes,
          phase: "reveal",
          scores: { ...state.scores, [event.userId]: (state.scores[event.userId] ?? 0) + 1 },
          result: { winner: event.userId, answer: card?.answer ?? null },
        };
      }
      return { ...state, votes };
    }

    case "reveal":
      return { ...state, phase: "reveal", result: state.result ?? tallyVotes(state, state.votes) };

    case "levelVote": {
      // icebreaker: majority to go deeper unlocks the next level
      if (state.kind !== "icebreaker") return state;
      const votes = { ...state.votes, [event.userId]: String(event.level) };
      const wantDeeper = Object.values(votes).filter(
        (v) => Number(v) > state.level,
      ).length;
      if (wantDeeper >= majority(state.players.length) && state.level < 3) {
        return { ...state, level: state.level + 1, votes: {} };
      }
      return { ...state, votes };
    }

    case "end":
      return { ...state, phase: "ended" };

    default:
      return state;
  }
}

function tallyVotes(state: BaseState, votes: Record<string, string>): Record<string, unknown> {
  const counts: Record<string, number> = {};
  for (const choice of Object.values(votes)) {
    counts[choice] = (counts[choice] ?? 0) + 1;
  }
  if (state.kind === "most_likely") {
    // reveal COUNTS ONLY — never who voted for whom (plan §6)
    return { counts };
  }
  if (state.kind === "two_truths") {
    const card = state.cards[state.cardIndex];
    return { counts, lie: card?.answer ?? null };
  }
  // hot_takes: A/B split
  return { counts };
}

/** Build the deck of cards for a game from stored deck_cards. */
export function toCards(
  rows: { id: string; text: string; answer: string | null }[],
): Card[] {
  return rows.map((r) => ({ id: r.id, text: r.text, answer: r.answer }));
}

export type { BaseState, Card, DeckKind, GameEvent, Player };
