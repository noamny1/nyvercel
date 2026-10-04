export function NewsTicker({ titles, seconds = 12, source = "" }: { titles: string[]; seconds?: number; source?: string }) {
  const body = titles.length ? titles.join("   ·   ") : "אין חדשות כרגע";
  const text = source ? `${source}   ·   ${body}` : body;
  const duration = Math.max(24, Math.max(titles.length, 1) * seconds);
  return (
    <div className="ticker">
      <div className="ticker-track" style={{ animationDuration: `${duration}s` }}>{text} &nbsp;&nbsp; {text}</div>
    </div>
  );
}