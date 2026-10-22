"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "nytv-cookie-ok";

export function CookieNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  return (
    <aside className="cookie-note" aria-label="הודעה על עוגיות">
      <p>
        האתר משתמש רק בעוגיות הכרחיות לכניסה לניהול. אין עוגיות פרסום או מעקב.{" "}
        <Link href="/privacy">מדיניות הפרטיות</Link>
      </p>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(KEY, "1");
          } catch {
            /* the notice can still close for this visit */
          }
          setOpen(false);
        }}
      >
        הבנתי
      </button>
    </aside>
  );
}
