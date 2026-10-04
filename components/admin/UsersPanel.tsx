"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { assignScreens, createClientUser, deleteClientUser, saveAndSendUser } from "@/app/admin/users/actions";
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
  selected,
  onToggle,
}: {
  selected: Screen[];
  onToggle: (screen: Screen) => void;
}) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Screen[]>([]);
  const [empty, setEmpty] = useState(false);
  const text = query.trim();

  useEffect(() => {
    if (!text) {
      setMatches([]);
      setEmpty(false);
      return;
    }
    const handle = setTimeout(async () => {
      const response = await fetch(`/api/admin/screens?q=${encodeURIComponent(text)}`);
      const data = await response.json();
      const screens = data.screens || [];
      setMatches(screens);
      setEmpty(screens.length === 0);
    }, 180);
    return () => clearTimeout(handle);
  }, [text]);

  return (
    <div className="picks">
      <label>חיפוש מסך<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="רחוב, מספר, עיר או מספר מסך" /></label>
      {empty ? <p>אין מסך שמתאים לחיפוש.</p> : null}
      {matches.map((screen) => (
        <button className="light" type="button" key={screen.id} onClick={() => onToggle(screen)}>
          {selected.some((item) => item.id === screen.id) ? "הסר" : "שייך"} · מסך {screen.id} · {line(screen)}
        </button>
      ))}
      {selected.length > 0 ? (
        <div className="chosen">
          {selected.map((screen) => (
            <span key={screen.id}>
              מסך {screen.id} · {line(screen)}
              <button className="light" type="button" onClick={() => onToggle(screen)}>הסרה</button>
            </span>
          ))}
        </div>
      ) : <p>עדיין לא שויך מסך.</p>}
    </div>
  );
}

export function UsersPanel({ users, query }: { users: UserRow[]; query: string }) {
  const router = useRouter();
  const [card, setCard] = useState<{ name: string; email: string; password: string; screens: string[] } | null>(null);
  const [dialog, setDialog] = useState<{ ok: boolean; message: string } | null>(null);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [selected, setSelected] = useState<Screen[]>([]);

  function toggle(screen: Screen) {
    setSelected((current) => current.some((item) => item.id === screen.id) ? current.filter((item) => item.id !== screen.id) : [...current, screen]);
  }

  async function onCreate(formData: FormData) {
    setError("");
    setDialog(null);
    const result = await createClientUser(formData);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCard(result.card);
    setPassword("");
    setSelected([]);
    if (formData.get("intent") === "send") {
      setDialog({
        ok: result.sent,
        message: result.sent ? `המייל נשלח אל ${result.card.email}` : result.mailError || "המייל לא נשלח.",
      });
    }
    router.refresh();
  }

  return (
    <div>
      {dialog ? <ResultDialog dialog={dialog} onClose={() => setDialog(null)} /> : null}
      <form className="card" action={onCreate}>
        <h2>משתמש חדש</h2>
        <div className="row">
          <label>שם הלקוח<input name="name" required placeholder="ועד הבית" /></label>
          <label>אימייל<input name="email" type="email" required /></label>
          <label>סיסמה<input name="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="לפחות 6 תווים" /></label>
          <button className="light" type="button" onClick={() => setPassword(makePassword())}>סיסמה אוטומטית</button>
        </div>
        <p>מחפשים מסך ומשייכים אותו למשתמש הזה.</p>
        {selected.map((screen) => <input key={screen.id} type="hidden" name="screenId" value={screen.id} />)}
        <ScreenSearch selected={selected} onToggle={toggle} />
        {error ? <p className="error">{error}</p> : null}
        <div className="row">
          <button type="submit" name="intent" value="save">שמירה</button>
          <button type="submit" name="intent" value="send">שמירה ושליחה</button>
        </div>
      </form>
      <UserLookup initial={users} />
    </div>
  );
}

function UserLookup({ initial }: { initial: UserRow[] }) {
  const [text, setText] = useState("");
  const [options, setOptions] = useState<UserRow[]>([]);
  const [chosen, setChosen] = useState<UserRow | null>(initial[0] || null);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    const query = text.trim();
    if (!query) {
      setOptions([]);
      setEmpty(false);
      return;
    }
    const handle = setTimeout(async () => {
      const response = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      const users = data.users || [];
      setOptions(users);
      setEmpty(users.length === 0);
    }, 180);
    return () => clearTimeout(handle);
  }, [text]);

  return (
    <>
      <section className="card">
        <h2>חיפוש משתמש</h2>
        <label>שם או אימייל
          <input value={text} onChange={(event) => setText(event.target.value)} placeholder="התחילו להקליד" autoComplete="off" />
        </label>
        {options.length > 0 ? (
          <div className="suggest">
            {options.map((user) => (
              <button type="button" key={user.id} onClick={() => { setChosen(user); setOptions([]); setText(""); }}>
                {user.name || user.email} · {user.email}
              </button>
            ))}
          </div>
        ) : null}
        {empty ? <p>לא נמצא משתמש.</p> : null}
      </section>
      {chosen ? <UserAssign key={chosen.id} user={chosen} /> : null}
    </>
  );
}

function UserAssign({ user }: { user: UserRow }) {
  const [selected, setSelected] = useState<Screen[]>([]);
  const [dialog, setDialog] = useState<{ ok: boolean; message: string } | null>(null);
  useEffect(() => {
    if (!user.screenIds.length) return;
    fetch(`/api/admin/screens?ids=${user.screenIds.join(",")}`)
      .then((response) => response.json())
      .then((data) => setSelected(data.screens || []))
      .catch(() => setSelected([]));
  }, [user]);
  function toggle(screen: Screen) {
    setSelected((current) => current.some((item) => item.id === screen.id) ? current.filter((item) => item.id !== screen.id) : [...current, screen]);
  }
  async function onSaveSend(formData: FormData) {
    const result = await saveAndSendUser(formData);
    setDialog({
      ok: result.sent,
      message: result.sent
        ? `המייל נשלח אל ${result.card.email}. הסיסמה החדשה: ${result.card.password}`
        : result.mailError || "המייל לא נשלח.",
    });
  }
  return (
    <form className="card" action={assignScreens}>
      {dialog ? <ResultDialog dialog={dialog} onClose={() => setDialog(null)} /> : null}
      <h2>{user.name || user.email}</h2>
      <p>{user.email}</p>
      <input type="hidden" name="userId" value={user.id} />
      <input type="hidden" name="q" value={user.email} />
      {selected.map((screen) => <input key={screen.id} type="hidden" name="screenId" value={screen.id} />)}
      <ScreenSearch selected={selected} onToggle={toggle} />
      <div className="row">
        <button type="submit">שמירת שיוך</button>
        <button type="submit" formAction={onSaveSend}>שמירה ושליחה</button>
        <button className="light" formAction={deleteClientUser} type="submit">מחיקת משתמש</button>
      </div>
    </form>
  );
}

function ResultDialog({ dialog, onClose }: { dialog: { ok: boolean; message: string }; onClose: () => void }) {
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="card">
        <h2>{dialog.ok ? "השליחה הצליחה" : "השליחה לא הצליחה"}</h2>
        <p>{dialog.message}</p>
        <button type="button" onClick={onClose}>סגירה</button>
      </div>
    </div>
  );
}
