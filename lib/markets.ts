const PAIRS = [
  { from: "USD", name: "דולר" },
  { from: "EUR", name: "אירו" },
  { from: "GBP", name: "ליש״ט" },
];

export async function markets() {
  const rows: { name: string; value: string }[] = [];
  await Promise.all(
    PAIRS.map(async (pair) => {
      try {
        const response = await fetch(`https://api.frankfurter.app/latest?from=${pair.from}&to=ILS`, {
          next: { revalidate: 300 },
        });
        if (!response.ok) return;
        const data = (await response.json()) as { rates?: { ILS?: number } };
        if (!data.rates?.ILS) return;
        rows.push({ name: pair.name, value: data.rates.ILS.toFixed(3) });
      } catch {
        /* skip a rate that failed */
      }
    }),
  );
  try {
    const response = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/%5ETA125.TA?interval=1d&range=1d",
      { next: { revalidate: 300 }, headers: { "User-Agent": "Mozilla/5.0" } },
    );
    if (response.ok) {
      const data = (await response.json()) as {
        chart?: { result?: { meta?: { regularMarketPrice?: number } }[] };
      };
      const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price) rows.push({ name: "ת״א 125", value: price.toLocaleString("he-IL") });
    }
  } catch {
    /* index is optional */
  }
  return rows;
}
