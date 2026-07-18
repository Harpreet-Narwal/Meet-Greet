import { initialState, reduce, type BaseState, type Card, type Player } from "./index";

const players: Player[] = [
  { user_id: "a", first_name: "Aisha" },
  { user_id: "b", first_name: "Bala" },
  { user_id: "c", first_name: "Chetan" },
];

const cards: Card[] = [
  { id: "c1", text: "Card one" },
  { id: "c2", text: "Card two" },
];

function start(kind: BaseState["kind"], deck = cards, level = 1): BaseState {
  return reduce(initialState(players), { type: "start", deckKind: kind, cards: deck, level, startedBy: "a" });
}

describe("game engine — icebreaker", () => {
  it("deals a card and advances", () => {
    let s = start("icebreaker");
    expect(s.phase).toBe("card");
    expect(s.cards[s.cardIndex]!.id).toBe("c1");
    s = reduce(s, { type: "advance" });
    expect(s.cards[s.cardIndex]!.id).toBe("c2");
    s = reduce(s, { type: "advance" });
    expect(s.phase).toBe("ended");
  });

  it("majority level-vote unlocks the next level", () => {
    let s = start("icebreaker");
    expect(s.level).toBe(1);
    s = reduce(s, { type: "levelVote", userId: "a", level: 2 });
    expect(s.level).toBe(1); // 1 of 3, no majority
    s = reduce(s, { type: "levelVote", userId: "b", level: 2 });
    expect(s.level).toBe(2); // 2 of 3 → majority, deeper
  });

  it("never exceeds level 3", () => {
    let s = start("icebreaker", cards, 3);
    s = reduce(s, { type: "levelVote", userId: "a", level: 4 });
    s = reduce(s, { type: "levelVote", userId: "b", level: 4 });
    expect(s.level).toBe(3);
  });
});

describe("game engine — hot_takes", () => {
  it("collects votes then reveals the A/B split when everyone has voted", () => {
    let s = start("hot_takes");
    expect(s.phase).toBe("voting");
    s = reduce(s, { type: "vote", userId: "a", choice: "A" });
    s = reduce(s, { type: "vote", userId: "b", choice: "B" });
    expect(s.phase).toBe("voting"); // still waiting on c
    s = reduce(s, { type: "vote", userId: "c", choice: "A" });
    expect(s.phase).toBe("reveal");
    expect(s.result).toEqual({ counts: { A: 2, B: 1 } });
  });
});

describe("game engine — most_likely (privacy)", () => {
  it("reveals counts only — never who voted for whom", () => {
    let s = start("most_likely");
    s = reduce(s, { type: "vote", userId: "a", choice: "b" });
    s = reduce(s, { type: "vote", userId: "b", choice: "c" });
    s = reduce(s, { type: "vote", userId: "c", choice: "b" });
    expect(s.phase).toBe("reveal");
    // result carries counts, and NOTHING that maps a voter to their choice
    expect(s.result).toEqual({ counts: { b: 2, c: 1 } });
    expect(JSON.stringify(s.result)).not.toContain('"a"'); // voter a never appears
  });
});

describe("game engine — trivia", () => {
  it("first correct answer scores a point and reveals", () => {
    const triviaCards: Card[] = [{ id: "t1", text: "2+2?", answer: "4" }];
    let s = start("trivia", triviaCards);
    s = reduce(s, { type: "answer", userId: "a", answer: "5" });
    expect(s.phase).toBe("card");
    expect(s.scores.a).toBe(0);
    s = reduce(s, { type: "answer", userId: "b", answer: " 4 " });
    expect(s.phase).toBe("reveal");
    expect(s.scores.b).toBe(1);
    expect(s.result).toEqual({ winner: "b", answer: "4" });
  });
});

describe("game engine — two_truths", () => {
  it("reveals the lie after votes", () => {
    const ttCards: Card[] = [{ id: "tt1", text: "Aisha's statements", answer: "lie-text" }];
    let s = start("two_truths", ttCards);
    s = reduce(s, { type: "vote", userId: "a", choice: "s1" });
    s = reduce(s, { type: "vote", userId: "b", choice: "s2" });
    s = reduce(s, { type: "vote", userId: "c", choice: "s1" });
    expect(s.phase).toBe("reveal");
    expect(s.result).toMatchObject({ lie: "lie-text" });
  });
});

describe("game engine — determinism & reconnect", () => {
  it("is a pure function: same state + event → same result", () => {
    const s = start("hot_takes");
    const r1 = reduce(s, { type: "vote", userId: "a", choice: "A" });
    const r2 = reduce(s, { type: "vote", userId: "a", choice: "A" });
    expect(r1).toEqual(r2);
    // original state is not mutated (snapshot-safe for Redis persistence)
    expect(s.votes).toEqual({});
  });
});
