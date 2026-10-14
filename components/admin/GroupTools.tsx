"use client";

import { useRef, useState } from "react";

type Client = { id: number; name: string; email: string };
type Member = { id: number; email: string };

export function GroupTools({
  groupId,
  logoUrl,
  members,
  clients,
  saveLogo,
  saveUser,
  removeUser,
}: {
  groupId: number;
  logoUrl: string;
  members: Member[];
  clients: Client[];
  saveLogo: (formData: FormData) => void;
  saveUser: (formData: FormData) => void;
  removeUser: (formData: FormData) => void;
}) {
  const logoForm = useRef<HTMLFormElement>(null);
  const userForm = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState("");
  const taken = new Set(members.map((member) => member.id));
  const needle = query.trim().toLowerCase();
  const hits = needle
    ? clients.filter((user) => !taken.has(user.id) && user.email.toLowerCase().includes(needle)).slice(0, 8)
    : [];

  function choose(id: string) {
    setPicked(id);
    setQuery("");
    setOpen(false);
    const form = userForm.current;
    const field = form?.querySelector('input[name="userId"]') as HTMLInputElement | null;
    if (field) field.value = id;
    form?.requestSubmit();
  }

  return (
    <span className="group-tools">
      <form action={saveLogo} ref={logoForm}>
        <input type="hidden" name="id" value={groupId} />
        {logoUrl ? <img src={logoUrl} alt="" /> : null}
        <label className="file-pick">
          החלפת לוגו
          <input
            name="file"
            type="file"
            accept="image/*"
            onChange={(event) => {
              if (event.target.files?.length) logoForm.current?.requestSubmit();
            }}
          />
        </label>
      </form>
      <span className="group-members">
        {members.length ? members.map((member) => (
          <form action={removeUser} key={member.id}>
            <input type="hidden" name="id" value={groupId} />
            <input type="hidden" name="userId" value={member.id} />
            <span>{member.email}</span>
            <button type="submit" aria-label="הסרת משתמש">×</button>
          </form>
        )) : <span className="none">לא משוייך משתמש</span>}
      </span>
      <form action={saveUser} ref={userForm} className="user-find">
        <input type="hidden" name="id" value={groupId} />
        <input type="hidden" name="userId" value={picked} />
        <input
          value={query}
          placeholder="הוספה לפי מייל"
          aria-label="הוספה לפי מייל"
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
        />
        {open && needle ? (
          <span className="user-hits">
            {hits.length ? hits.map((user) => (
              <button type="button" key={user.id} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(String(user.id))}>
                {user.email}
              </button>
            )) : <span className="none">אין משתמש כזה</span>}
          </span>
        ) : null}
      </form>
    </span>
  );
}
