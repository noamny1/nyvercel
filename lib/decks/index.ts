import type { DeckCard, DeckId } from "./types";
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

function israelDayNumber() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

export function pickDeck(id: DeckId, offset = 0): DeckCard {
  const cards = DECKS[id];
  const index = (israelDayNumber() + SALT[id] + offset) % cards.length;
  return cards[(index + cards.length) % cards.length];
}

export type { DeckCard, DeckId };
