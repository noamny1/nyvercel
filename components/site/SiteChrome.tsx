import Link from "next/link";
import "@/app/marketing.css";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <a className="skip" href="#content">דילוג לתוכן</a>
      <Link className="manage" href="/admin">ניהול</Link>
      <div id="content">{children}</div>
      <footer className="foot">
        <Link href="/contact">יצירת קשר</Link>
        <Link href="/privacy">מדיניות פרטיות</Link>
        <Link href="/terms">תנאי שימוש</Link>
        <Link href="/accessibility">הצהרת נגישות</Link>
      </footer>
    </div>
  );
}
