export function ParashaSlide({
  name,
  candles,
  city,
  verses,
  seconds,
}: {
  name: string;
  candles: string;
  city: string;
  verses: string[];
  seconds?: number;
}) {
  const pace = Math.max(seconds || 40, Math.max(30, verses.length));
  return (
    <div className="parasha-slide">
      <header>
        <strong>{name ? `פרשת ${name}` : "פרשת השבוע"}</strong>
        <em>{candles ? `הדלקת נרות ${candles}` : "הדלקת נרות"}{city ? ` · ${city}` : ""}</em>
      </header>
      <div className="parasha-body">
        <p style={verses.length > 6 ? { animationDuration: `${pace}s` } : undefined}>
          {verses.length ? verses.map((verse, index) => <span key={index}>{verse}</span>) : <span>הפרשה המלאה תופיע במסך לפי השבת הקרובה.</span>}
        </p>
      </div>
    </div>
  );
}
