/**
 * Game engines are pure state machines (plan §6): (state, event) → state.
 * No I/O, no clocks, no randomness beyond a seed passed in. Unit-tested.
 */

export type DeckKind = "icebreaker" | "hot_takes" | "most_likely" | "trivia" | "two_truths";

export interface Player {
  user_id: string;
  first_name: string;
}

export interface Card {
  id: string;
  text: string;
  answer?: string | null;
}

export type GamePhase =
  | "lobby"
  | "card" // showing a card / prompt
  | "voting" // collecting votes
  | "reveal" // showing results
  | "ended";

export interface BaseState {
  kind: DeckKind;
  phase: GamePhase;
  players: Player[];
  cards: Card[];
  cardIndex: number;
  level: number; // icebreaker level 1|2|3
  scores: Record<string, number>; // user_id → points (trivia)
  // votes for the current card: user_id → their choice (choice meaning is per-kind)
  votes: Record<string, string>;
  // per-card revealed result payload
  result: Record<string, unknown> | null;
  startedBy: string;
}

/** Client → engine events. */
export type GameEvent =
  | { type: "start"; deckKind: DeckKind; level?: number; cards: Card[]; startedBy: string }
  | { type: "advance" } // next card
  | { type: "answer"; userId: string; answer: string } // trivia
  | { type: "vote"; userId: string; choice: string } // hot_takes / most_likely / two_truths
  | { type: "reveal" } // force reveal current
  | { type: "levelVote"; userId: string; level: number } // icebreaker go-deeper
  | { type: "end" };

export interface EngineResult {
  state: BaseState;
  /** side-effect-free notifications the gateway may broadcast. */
  emit?: { event: string; payload: Record<string, unknown> }[];
}
