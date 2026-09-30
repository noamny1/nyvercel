export function Shabbat({ candles, parsha }: { candles: string; parsha: string }) {
  return (
    <div className="widget">
      <h3>הדלקת נרות</h3>
      <div>{candles || "—"}</div>
      {parsha ? <div>פרשת {parsha}</div> : null}
    </div>
  );
}
