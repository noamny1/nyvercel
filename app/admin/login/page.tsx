"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState("");

  async function onSubmit(formData: FormData) {
    setError("");
    const result = await signIn("credentials", {
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
      redirect: false,
    });
    if (result?.error) {
      setError("הכניסה נכשלה. בודקים את האימייל והסיסמה שהוגדרו ב-Vercel.");
      return;
    }
    window.location.href = "/admin";
  }

  return (
    <main className="admin">
      <form
      className="card"
      style={{ display: "grid", gap: 12, maxWidth: 420 }}
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(new FormData(event.currentTarget));
      }}
    >
        <h1>כניסה לניהול</h1>
        <label>אימייל<input name="email" type="email" required /></label>
        <label>סיסמה<input name="password" type="password" required /></label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit">כניסה</button>
      </form>
    </main>
  );
}
