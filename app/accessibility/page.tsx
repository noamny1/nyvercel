import { SiteChrome } from "@/components/site/SiteChrome";

export const metadata = { title: "הצהרת נגישות · NYTV" };

export default function AccessibilityPage() {
  return (
    <SiteChrome>
      <article className="legal">
        <h1>הצהרת נגישות</h1>
        <p>אתר השיווק מונגש לפי תקן ישראלי 5568, המבוסס על WCAG 2.0 ברמה AA: שפה וכיוון עברית, ניגודיות, מקלדת, סימון פוקוס, טקסט חלופי לתמונה וקישור דילוג לתוכן.</p>
        <p>ייתכן שחלק ממסכי הניהול או ממסך הטלוויזיה עדיין אינם עומדים במלוא התקן. נתקן פער שדיווחתם עליו.</p>
        <p>פניות נגישות: noam6683@gmail.com. נא לציין את העמוד, מה ניסיתם לעשות, ואיזו טכנולוגיה מסייעת בשימוש אם יש.</p>
      </article>
    </SiteChrome>
  );
}
