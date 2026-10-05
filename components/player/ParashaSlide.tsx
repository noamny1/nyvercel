export function ParashaSlide({
  name,
  candles,
  city,
  verses,
  seconds,
  still = false,
}: {
  name: string;
  candles: string;
  city: string;
  verses: string[];
  seconds?: number;
  still?: boolean;
}) {
  const columns = verses.length > 100 ? 3 : verses.length > 55 ? 2 : 1;
  const perColumn = Math.max(1, Math.ceil(verses.length / columns));
  const fit = Math.max(1.15, Math.min(3.1, 92 / (perColumn * 1.28)));
  const pace = Math.max(seconds || 180, Math.round(verses.length * 2.2));
  return (
    <div className="parasha-slide">
      <header>
        <strong>{name ? `פרשת ${name}` : "פרשת השבוע"}</strong>
        <em>
          <img src="/candles.gif" alt="" />
          {candles ? `הדלקת נרות ${candles}` : "הדלקת נרות"}{city ? ` · ${city}` : ""}
        </em>
      </header>
      <div className={still ? "parasha-body is-still" : "parasha-body"}>
        <p style={still ? { columnCount: columns, fontSize: `${fit}cqh` } : verses.length > 6 ? { animationDuration: `${pace}s` } : undefined}>
          {verses.length ? verses.map((verse, index) => <span key={index}>{verse}</span>) : <span>הפרשה המלאה תופיע במסך לפי השבת הקרובה.</span>}
        </p>
      </div>
    </div>
  );
}