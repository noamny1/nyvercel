export function NewsTicker({ titles, seconds = 12 }: { titles: string[]; seconds?: number }) {
  const text = titles.length ? titles.join("   ·   ") : "אין חדשות";
  const duration = Math.max(24, titles.length * seconds);
  return (
    <div className="ticker">
      <div className="ticker-track" style={{ animationDuration: `${duration}s` }}>{text} &nbsp;&nbsp; {text}</div>
    </div>
  );
}