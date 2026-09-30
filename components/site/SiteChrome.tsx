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
        <Link className="admin-pill" href="/admin/login">ניהול מסכים ‹</Link>
        <nav className="menu" aria-label="ניווט">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={link.href === "/#home" ? "is-here" : undefined}>{link.label}</Link>
          ))}
        </nav>
        <Link className="brand" href="/#home" aria-label="NYmedia">
          <img src="/logo-nymedia.png" alt="" />
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
