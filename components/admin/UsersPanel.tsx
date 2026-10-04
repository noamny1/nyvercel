"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { assignScreens, createClientUser, deleteClientUser } from "@/app/admin/users/actions";
import { ClientCard } from "@/components/admin/ClientCard";

type Screen = { id: number; street: string; number: string; city: string; name: string };
type UserRow = { id: number; name: string; email: string; screenIds: number[] };

function line(screen: Screen) {
  const place = [screen.street, screen.number].filter(Boolean).join(" ");
  return [place, screen.city].filter(Boolean).join(", ") || screen.name || `מסך ${screen.id}`;
}

export function UsersPanel({ screens, users }: { screens: Screen[]; users: UserRow[] }) {
  const router = useRouter();
  const [card, setCard] = useState<{ name: string; email: string; password: string; screens: string[] } | null>(null);
  const [error, setError] = useState("");

  async function onCreate(formData: FormData) {
    setError("");
    const result = await createClientUser(formData);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCard(result.card);
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
          <label>סיסמה<input name="password" required minLength={6} placeholder="לפחות 6 תווים" /></label>
        </div>
        <fieldset className="picks">
          <legend>מסכים באחריות הלקוח</legend>
          {screens.length === 0 ? <p>אין עדיין מסכים לשיוך.</p> : null}
          {screens.map((screen) => (
            <label className="pick" key={screen.id}>
              <input type="checkbox" name="screenId" value={screen.id} />
              <span>מסך {screen.id} · {line(screen)}</span>
            </label>
          ))}
        </fieldset>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit">יצירה והצגת כרטיס</button>
      </form>
      {users.map((user) => (
        <form className="card" action={assignScreens} key={user.id}>
          <h2>{user.name || user.email}</h2>
          <p>{user.email}</p>
          <input type="hidden" name="userId" value={user.id} />
          <fieldset className="picks">
            <legend>המסכים שמשויכים</legend>
            {screens.map((screen) => (
              <label className="pick" key={screen.id}>
                <input type="checkbox" name="screenId" value={screen.id} defaultChecked={user.screenIds.includes(screen.id)} />
                <span>מסך {screen.id} · {line(screen)}</span>
              </label>
            ))}
          </fieldset>
          <div className="row">
            <button type="submit">שמירת שיוך</button>
            <button className="light" formAction={deleteClientUser} type="submit">מחיקת משתמש</button>
          </div>
        </form>
      ))}
    </div>
  );
}
