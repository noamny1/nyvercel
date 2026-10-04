"use client";

import { useState } from "react";

const LOGIN = "https://nytv.app/admin/login";

export function clientText(card: { name: string; email: string; password: string; screens: string[] }) {
  return [
    `שלום ${card.name || ""}`,
    "אלה פרטי הכניסה למסכים שבאחריותך.",
    LOGIN,
    `אימייל: ${card.email}`,
    `סיסמה: ${card.password}`,
    "המסכים:",
    ...(card.screens.length ? card.screens : ["לא שויכו מסכים"]),
  ].join("\n");
}

export function ClientCard(card: { name: string; email: string; password: string; screens: string[] }) {
  const [copied, setCopied] = useState(false);
  const text = clientText(card);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <section className="card details">
      <h2>פרטים ללקוח</h2>
      <p>אפשר להעתיק ולשלוח. הלקוח לוחץ על הקישור ונכנס.</p>
      <p><a href={LOGIN} target="_blank">{LOGIN}</a></p>
      <p>אימייל: {card.email}</p>
      <p>סיסמה: {card.password}</p>
      <p>{card.screens.length ? card.screens.join(" · ") : "לא שויכו מסכים"}</p>
      <button type="button" onClick={copy}>{copied ? "הועתק" : "העתקת הפרטים"}</button>
    </section>
  );
}
