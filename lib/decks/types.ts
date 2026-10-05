export type DeckCard = {
  title: string;
  lines: string[];
  image: string;
  portrait?: string;
  note?: string;
};

export type DeckId = "daily-health" | "did-you-know" | "street-people";
