import Link from "next/link";
import "@/app/marketing.css";

const links = [
  { href: "/admin/login", label: "ניהול" },
  { href: "/contact", label: "יצירת קשר" },
  { href: "/privacy", label: "פרטיות" },
  { href: "/terms", label: "תנאים" },
  { href: "/accessibility", label: "נגישות" },
];

export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <a className="skip" href="#content">דילוג לתוכן</a>
      <nav className="topbar" aria-label="ניווט">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={link.href === "/admin/login" ? "is-admin" : undefined}>
            {link.label}
          </Link>
        ))}
      </nav>
      <div id="content">{children}</div>
      <footer className="foot">
        <span>NYTV</span>
      </footer>
    </div>
  );
}
