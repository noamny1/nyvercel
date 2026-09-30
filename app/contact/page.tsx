"use client";

import { useState } from "react";
import { SiteChrome } from "@/components/site/SiteChrome";

export default function ContactPage() {
  const [agreed, setAgreed] = useState(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!agreed) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "");
    const email = String(data.get("email") || "");
    const message = String(data.get("message") || "");
    const body = `שם: ${name}\nדוא״ל: ${email}\n\n${message}`;
    window.location.href = `mailto:noam6683@gmail.com?subject=${encodeURIComponent("פנייה מ-NYmedia")}&body=${encodeURIComponent(body)}`;
  }

  return (
    <SiteChrome>
      <article className="legal">
        <h1>יצירת קשר</h1>
        <p>מסך לקיר, ללובי או ליד המעלית. הפנייה נפתחת בדוא״ל שלכם ואינה נשמרת אצלנו.</p>
        <form className="contact" onSubmit={onSubmit}>
          <label>שם<input name="name" required autoComplete="name" /></label>
          <label>דוא״ל<input name="email" type="email" required autoComplete="email" /></label>
          <label>הודעה<textarea name="message" required rows={5} /></label>
          <label className="row">
            <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
            <span>קראתי את מדיניות הפרטיות ואני מסכים שתחזרו אליי בעניין הפנייה הזו בלבד.</span>
          </label>
          <button type="submit" disabled={!agreed}>שליחה</button>
        </form>
      </article>
    </SiteChrome>
  );
}
