import Link from "next/link";
import { Heebo } from "next/font/google";
import "@/app/marketing.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400"],
  display: "swap",
});

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
    <div className={`site ${heebo.className}`}>
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
            <path d="M28 6 L40 16" fill="none" stroke="#FFFFFF" strokeWidth="1.25" />
            <path d="M52 6 L40 16" fill="none" stroke="#FFFFFF" strokeWidth="1.25" />
            <rect x="8" y="14" width="72" height="40" rx="10" fill="none" stroke="#FFFFFF" strokeWidth="1.25" />
            <text x="15" y="39" fill="#FFFFFF" fontFamily="Heebo, sans-serif" fontSize="12" fontWeight="400">NYMEDIA</text>
            <text x="88" y="36" fill="#FFFFFF" fontFamily="Heebo, sans-serif" fontSize="11" fontWeight="300">מסכי שילוט</text>
            <text x="88" y="50" fill="#FFFFFF" fontFamily="Heebo, sans-serif" fontSize="11" fontWeight="300">דיגיטליים</text>
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
