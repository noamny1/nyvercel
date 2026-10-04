"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const path = usePathname();
  return (
    <header className="admin-bar">
      <div className="admin-bar-inner">
        <Link className="admin-brand" href="/admin">
          <strong>NYmedia</strong>
          <span>ניהול מסכים</span>
        </Link>
        <nav className="admin-nav" aria-label="ניהול">
          {LINKS.map(([href, label]) => {
            const on = href === "/admin" ? path === "/admin" : path.startsWith(href);
            return (
              <Link key={href} href={href} className={on ? "is-on" : undefined}>{label}</Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
