"use client";

import { useMemo } from "react";

import { deckCount, pickDeck, type DeckId } from "@/lib/decks";
import { useTurn } from "@/components/player/useTurn";

const KICKER: Record<DeckId, string> = {
  "daily-health": "טיפ בריאות יומי",
  "did-you-know": "הידעת",
  "street-people": "אנשים",
};

const NOTE: Partial<Record<DeckId, string>> = {
  "daily-health": "טיפ כללי ליום. לא במקום פנייה לרופא.",
  "street-people": "על שמו יש רחוב בישראל",
};

export function KnowledgeSlide({ deck, offset = 0 }: { deck: DeckId; offset?: number }) {
  const turn = useTurn();
  const card = useMemo(() => pickDeck(deck, offset, turn), [deck, offset, turn]);
  const total = deckCount(deck);
  return (
    <article className="know">
      <img className="know-bg" src={card.image} alt="" />
      <div className="know-veil" />
      <div className="know-bar" />
      <div className="know-body">
        <p className="know-kicker">{KICKER[deck]}</p>
        <div className="know-head">
          {card.portrait ? <img className="know-portrait" src={card.portrait} alt="" /> : null}
          <h2>{card.title}</h2>
        </div>
        <ul>
          {card.lines.map((line) => (
            <li key={line}>
              <i />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <p className="know-note">{card.note || NOTE[deck] || "מתחלף כל 3 שעות"} · {total} נושאים במאגר</p>
      </div>
    </article>
  );
}
