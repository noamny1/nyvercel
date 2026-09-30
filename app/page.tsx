import Link from "next/link";
import { SiteChrome } from "@/components/site/SiteChrome";

export default function Home() {
  return (
    <SiteChrome>
      <section className="hero">
        <img src="/lobby.jpg" alt="מסך דק על קיר אבן בלובי של בניין מגורים" />
        <div className="hero-copy">
          <p className="eyebrow">NYTV</p>
          <h1>מסך על הקיר. לובי שמסביר את עצמו.</h1>
          <p className="lead">שילוט דיגיטלי לבנייני מגורים ולעסקים. הודעות הבניין, שעון, מזג אוויר וחדשות, על מסך בלובי, על הקיר או ליד המעלית.</p>
          <Link className="cta" href="/contact">שיחה על הבניין</Link>
        </div>
      </section>
      <section className="band">
        <h2>איפה המסך יושב</h2>
        <div className="places">
          <article className="place">
            <h3>על הקיר</h3>
            <p>מסך דק בלובי או בכניסה למשרד. השקף ממלא את התמונה, והמידע נשאר בצד.</p>
          </article>
          <article className="place">
            <h3>בלובי</h3>
            <p>הודעות ועד, לוגו הבניין והכתובת. כל הדיירים רואים את אותו מסך.</p>
          </article>
          <article className="place">
            <h3>ליד המעלית</h3>
            <p>מדריך קומות לעסק, או הודעה קצרה בזמן ההמתנה.</p>
          </article>
        </div>
      </section>
      <section className="dark">
        <div className="band">
          <h2>מה רץ על המסך</h2>
          <p>שקפים של הבניין, שעון, מזג אוויר, הדלקת נרות, פס חדשות ומטבעות. התמה נבחרת בבניין, בלי להחליף את המסך.</p>
        </div>
      </section>
      <section className="band">
        <h2>שאלות</h2>
        <div className="faq">
          <article className="qa">
            <h3>מי מעדכן את התוכן?</h3>
            <p>נציג הבניין נכנס עם משתמש וסיסמה משלו. מסך נוסף נפתח רק אחרי אישור של מנהל המערכת.</p>
          </article>
          <article className="qa">
            <h3>צריך מחשב ליד הטלוויזיה?</h3>
            <p>הטלוויזיה פותחת כתובת אחת בדפדפן. אין התקנה במשרד.</p>
          </article>
          <article className="qa">
            <h3>מה עם פרטיות?</h3>
            <p>אין מעקב פרסומי באתר. מדיניות הפרטיות מסבירה איזה מידע נשמר ולמה.</p>
          </article>
        </div>
      </section>
    </SiteChrome>
  );
}
