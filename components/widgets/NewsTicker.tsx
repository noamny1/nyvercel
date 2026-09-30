export function NewsTicker({ titles }: { titles: string[] }) {
  const text = titles.length ? titles.join("   ·   ") : "אין חדשות";
  return (
    <div className="ticker">
      <div className="ticker-track">{text} &nbsp;&nbsp; {text}</div>
    </div>
  );
}
