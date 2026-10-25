export function Notices({ items }: { items: string[] }) {
  return (
    <div className="widget">
      <h3>הודעות הבניין</h3>
      {items.length === 0 ? <div className="notice">אין הודעות</div> : items.map((item) => (
        <div className="notice" key={item}>{item}</div>
      ))}
    </div>
  );
}
