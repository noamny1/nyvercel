"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { assignScreens, createClientUser, deleteClientUser } from "@/app/admin/users/actions";
import { ClientCard } from "@/components/admin/ClientCard";

type Screen = { id: number; street: string; number: string; city: string; name: string };
type UserRow = { id: number; name: string; email: string; screenIds: number[] };

function line(screen: Screen) {
  const place = [screen.street, screen.number].filter(Boolean).join(" ");
  return [place, screen.city].filter(Boolean).join(", ") || screen.name || `מסך ${screen.id}`;
}

function makePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

function ScreenSearch({
  screens,
  selected,
  onToggle,
}: {
  screens: Screen[];
  selected: number[];
  onToggle: (id: number) => void;
}) {
  const [query, setQuery] = useState("");
  const text = query.trim();
  const matches = useMemo(() => {
    if (text.length < 1) return [];
    const needle = text.toLowerCase();
    return screens
      .filter((screen) => `${screen.id} ${line(screen)} ${screen.name}`.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [screens, text]);
  const chosen = screens.filter((screen) => selected.includes(screen.id));

  return (
    <div className="picks">
      <label>חיפוש מסך<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="רחוב, מספר, עיר או מספר מסך" /></label>
      {text && matches.length === 0 ? <p>אין מסך שמתאים לחיפוש.</p> : null}
      {matches.map((screen) => (
        <button className="light" type="button" key={screen.id} onClick={() => onToggle(screen.id)}>
          {selected.includes(screen.id) ? "הסר" : "שייך"} · מסך {screen.id} · {line(screen)}
        </button>
      ))}
      {chosen.length > 0 ? (
        <div className="chosen">
          {chosen.map((screen) => (
            <span key={screen.id}>
              מסך {screen.id} · {line(screen)}
              <button className="light" type="button" onClick={() => onToggle(screen.id)}>הסרה</button>
            </span>
          ))}
        </div>
      ) : <p>עדיין לא שויך מסך.</p>}
    </div>
  );
}

export function UsersPanel({ screens, users }: { screens: Screen[]; users: UserRow[] }) {
  const router = useRouter();
  const [card, setCard] = useState<{ name: string; email: string; password: string; screens: string[] } | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [selected, setSelected] = useState<number[]>([]);

  function toggle(id: number) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function onCreate(formData: FormData) {
    setError("");
    setNotice("");
    const result = await createClientUser(formData);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCard(result.card);
    setPassword("");
    setSelected([]);
    if (formData.get("intent") === "send") {
      setNotice(result.sent ? "המשתמש נשמר והמייל נשלח ללקוח מהמערכת." : result.mailError || "המשתמש נשמר, אבל המייל לא נשלח.");
    }
    router.refresh();
  }

  return (
    <div>
      {card ? <ClientCard {...card} /> : null}
      <form className="card" action={onCreate}>
        <h2>משתמש חדש</h2>
        <div className="row">
          <label>שם הלקוח<input name="name" required placeholder="ועד הבית" /></label>
          <label>אימייל<input name="email" type="email" required /></label>
          <label>סיסמה<input name="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="לפחות 6 תווים" /></label>
          <button className="light" type="button" onClick={() => setPassword(makePassword())}>סיסמה אוטומטית</button>
        </div>
        <p>מחפשים מסך ומשייכים אותו למשתמש הזה.</p>
        {selected.map((id) => <input key={id} type="hidden" name="screenId" value={id} />)}
        <ScreenSearch screens={screens} selected={selected} onToggle={toggle} />
        {error ? <p className="error">{error}</p> : null}
        {notice ? <p>{notice}</p> : null}
        <div className="row">
          <button type="submit" name="intent" value="save">שמירה</button>
          <button type="submit" name="intent" value="send">שמירה ושליחה</button>
        </div>
      </form>
      {users.map((user) => (
        <UserAssign key={user.id} user={user} screens={screens} />
      ))}
    </div>
  );
}

function UserAssign({ user, screens }: { user: UserRow; screens: Screen[] }) {
  const [selected, setSelected] = useState(user.screenIds);
  function toggle(id: number) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }
  return (
    <form className="card" action={assignScreens}>
      <h2>{user.name || user.email}</h2>
      <p>{user.email}</p>
      <input type="hidden" name="userId" value={user.id} />
      {selected.map((id) => <input key={id} type="hidden" name="screenId" value={id} />)}
      <ScreenSearch screens={screens} selected={selected} onToggle={toggle} />
      <div className="row">
        <button type="submit">שמירת שיוך</button>
        <button className="light" formAction={deleteClientUser} type="submit">מחיקת משתמש</button>
      </div>
    </form>
  );
}
