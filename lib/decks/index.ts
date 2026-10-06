import type { DeckCard, DeckId } from "./types";
import { currentTurn } from "@/lib/turn";
import { HEALTH } from "./health";
import { FACTS } from "./facts";
import { PEOPLE } from "./people";

const DECKS: Record<DeckId, DeckCard[]> = {
  "daily-health": HEALTH,
  "did-you-know": FACTS,
  "street-people": PEOPLE,
};

const SALT: Record<DeckId, number> = {
  "daily-health": 3,
  "did-you-know": 17,
  "street-people": 29,
};

export function isDeckId(value?: string): value is DeckId {
  return value === "daily-health" || value === "did-you-know" || value === "street-people";
}

export function deckCount(id: DeckId) {
  return DECKS[id].length;
}

export function pickDeck(id: DeckId, offset = 0, turn = currentTurn()): DeckCard {
  const cards = DECKS[id];
  const index = (turn + SALT[id] + offset) % cards.length;
  return cards[(index + cards.length) % cards.length];
}

export type { DeckCard, DeckId };
