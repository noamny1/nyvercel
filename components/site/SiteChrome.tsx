import Link from "next/link";
import "@/app/marketing.css";

const links = [
  { href: "/#home", label: "בית" },
  { href: "/#solutions", label: "פתרונות" },
  { href: "/#fields", label: "תחומים" },
  { href: "/#projects", label: "פרויקטים" },
  { href: "/#about", label: "אודות" },
  { href: "/contact", label: "צור קשר" },
];

export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <a className="skip" href="#content">דילוג לתוכן</a>
      <header className="bar">
        <Link className="admin-pill" href="/admin/login">ניהול ‹</Link>
        <nav className="menu" aria-label="ניווט">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>{link.label}</Link>
          ))}
        </nav>
        <Link className="brand" href="/#home" aria-label="NYmedia">
          <svg viewBox="0 0 168 64" role="img" aria-hidden="true">
            <path d="M28 6 L40 16" fill="none" stroke="#F5F3EF" strokeWidth="2" />
            <path d="M52 6 L40 16" fill="none" stroke="#F5F3EF" strokeWidth="2" />
            <rect x="8" y="14" width="72" height="40" rx="10" fill="none" stroke="#F5F3EF" strokeWidth="2" />
            <text x="16" y="39" fill="#F5F3EF" fontFamily="Calibri, Segoe UI, sans-serif" fontSize="13" fontWeight="700">NYMEDIA</text>
            <text x="88" y="36" fill="#F5F3EF" fontFamily="Calibri, Segoe UI, sans-serif" fontSize="11">מסכי שילוט</text>
            <text x="88" y="50" fill="#F5F3EF" fontFamily="Calibri, Segoe UI, sans-serif" fontSize="11">דיגיטליים</text>
          </svg>
        </Link>
      </header>
      <div id="content">{children}</div>
      <footer className="foot">
        <Link href="/privacy">מדיניות פרטיות</Link>
        <Link href="/terms">תנאי שימוש</Link>
        <Link href="/accessibility">הצהרת נגישות</Link>
      </footer>
    </div>
  );
}
