import Link from "next/link";
import { SiteChrome } from "@/components/site/SiteChrome";

export default function Home() {
  return (
    <SiteChrome>
      <img className="hero-photo" id="home" src="/hero.jpg" alt="לובי עם מסך גדול על הקיר" />
      <section className="intro">
        <div className="intro-copy">
          <p className="eyebrow">NYMEDIA</p>
          <h1>מסך על הקיר.<br />לובי שמסביר את עצמו.</h1>
          <p className="lead">פתרונות שילוט דיגיטלי למשרדים, לובי, בתי מלון ומרכזי מסחר. המסך מעביר הודעה, שעון וחדשות, בלי מחשב ליד הטלוויזיה.</p>
        </div>
        <div className="intro-actions">
          <a className="ghost" href="#projects">לצפייה בפרויקטים ‹</a>
          <Link className="ghost" href="/contact">דברו איתנו ‹</Link>
          <a className="down" href="#solutions" aria-label="למטה">↓</a>
        </div>
      </section>
      <section className="band" id="solutions">
        <h2>פתרונות</h2>
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
      <section className="band" id="fields">
        <h2>תחומים</h2>
        <div className="places">
          <article className="place">
            <h3>בנייני מגורים</h3>
            <p>הודעות דיירים, הדלקת נרות ומזג אוויר, על מסך אחד בכניסה.</p>
          </article>
          <article className="place">
            <h3>משרדים</h3>
            <p>מדריך קומות, לוגו החברה וחדשות, בלי להחליף את הטלוויזיה.</p>
          </article>
          <article className="place">
            <h3>מלונות ומסחר</h3>
            <p>מסך שמקבל את האורח ומתחלף לפי מה שהמקום צריך להציג.</p>
          </article>
        </div>
      </section>
      <section className="band" id="projects">
        <h2>פרויקטים</h2>
        <p>כל בניין הוא מסך עם כתובת משלו. השקפים, הלוגו וההודעות מתעדכנים מהניהול, והטלוויזיה רק פותחת את הכתובת.</p>
      </section>
      <section className="band" id="about">
        <h2>אודות</h2>
        <p>NYmedia בונה מסכי שילוט לבניינים ולעסקים. נציג הבניין נכנס עם משתמש משלו. מסך נוסף נפתח רק אחרי אישור של מנהל המערכת.</p>
      </section>
    </SiteChrome>
  );
}
