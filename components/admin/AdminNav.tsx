"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

const OWNER_LINKS = [
  ["/admin", "קבוצות"],
  ["/admin/buildings", "בניינים"],
  ["/admin/music", "מוזיקה"],
  ["/admin/news", "חדשות"],
  ["/admin/directory", "קומות"],
  ["/admin/control", "לוח בקרה"],
  ["/admin/users", "משתמשים"],
  ["/admin/manage", "ניהול"],
];

export function AdminNav() {
  const path = usePathname();
  const { data } = useSession();
  const owner = data?.user?.name === "owner" || data?.user?.email?.toLowerCase() === "noam6683@gmail.com";
  return (
    <>
      <header className="admin-bar">
        <div className="admin-bar-inner">
          <Link className="admin-brand" href={owner ? "/admin" : "/admin/buildings"} aria-label="בית">
            <strong>NYmedia</strong>
            <span>בית</span>
          </Link>
          <button className="admin-exit" type="button" onClick={() => signOut({ callbackUrl: "/admin/login" })}>יציאה</button>
        </div>
      </header>
      {owner ? (
        <nav className="admin-menu" aria-label="ניהול">
          {OWNER_LINKS.map(([href, label]) => {
            const on = href === "/admin" ? path === "/admin" : path.startsWith(href);
            return (
              <Link key={href} href={href} className={on ? "is-on" : undefined}>{label}</Link>
            );
          })}
        </nav>
      ) : null}
    </>
  );
}
