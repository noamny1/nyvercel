import Link from "next/link";

const LINKS = [
  ["/admin", "קבוצות"],
  ["/admin/buildings", "בניינים"],
  ["/admin/tickers", "טיקרים"],
  ["/admin/music", "מוזיקה"],
  ["/admin/news", "חדשות"],
  ["/admin/directory", "קומות"],
  ["/admin/control", "לוח בקרה"],
];

export function AdminNav() {
  return (
    <p className="row">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href}>{label}</Link>
      ))}
    </p>
  );
}
