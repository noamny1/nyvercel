"use client";

import { getSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

const FLAG = "nytv-remember=1";

function saved() {
  return document.cookie.split("; ").includes(FLAG);
}

function remember(on: boolean, email: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  if (on) {
    document.cookie = `${FLAG}; Max-Age=2592000; Path=/; SameSite=Lax${secure}`;
    localStorage.setItem("nytv-email", email);
    return;
  }
  document.cookie = `nytv-remember=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
  localStorage.removeItem("nytv-email");
}

export default function LoginPage() {
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [keep, setKeep] = useState(false);

  useEffect(() => {
    if (!saved()) {
      void signOut({ redirect: false });
      return;
    }
    setKeep(true);
    setEmail(localStorage.getItem("nytv-email") || "");
    void getSession().then((session) => {
      if (session) window.location.href = "/admin";
    });
  }, []);

  async function onSubmit(formData: FormData) {
    setError("");
    const nextEmail = String(formData.get("email") || "");
    const keepLogin = formData.get("remember") === "on";
    const result = await signIn("credentials", {
      email: nextEmail,
      password: String(formData.get("password") || ""),
      remember: keepLogin ? "1" : "0",
      redirect: false,
    });
    if (result?.error) {
      setError("הכניסה נכשלה. בודקים את האימייל והסיסמה.");
      return;
    }
    remember(keepLogin, nextEmail);
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
        <label>אימייל<input name="email" type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>סיסמה<input name="password" type="password" required autoComplete="current-password" /></label>
        <label className="row">
          <input name="remember" type="checkbox" checked={keep} onChange={(event) => setKeep(event.target.checked)} />
          <span>שמור את הכניסה במכשיר זה</span>
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit">כניסה</button>
      </form>
    </main>
  );
}
