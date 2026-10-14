"use client";

import { useRef, useState } from "react";

type Client = { id: number; name: string; email: string };

export function GroupTools({
  groupId,
  logoUrl,
  userId,
  userName,
  clients,
  saveLogo,
  saveUser,
}: {
  groupId: number;
  logoUrl: string;
  userId: string;
  userName: string;
  clients: Client[];
  saveLogo: (formData: FormData) => void;
  saveUser: (formData: FormData) => void;
}) {
  const logoForm = useRef<HTMLFormElement>(null);
  const userForm = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState(userName);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(userId);
  const needle = query.trim().toLowerCase();
  const hits = clients.filter((user) => {
    const label = `${user.name} ${user.email}`.toLowerCase();
    return !needle || label.includes(needle);
  }).slice(0, 8);

  function choose(id: string, label: string) {
    setPicked(id);
    setQuery(label);
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
      <form action={saveUser} ref={userForm} className="user-find">
        <input type="hidden" name="id" value={groupId} />
        <input type="hidden" name="userId" value={picked} />
        <input
          value={query}
          placeholder="חיפוש משתמש"
          aria-label="חיפוש משתמש"
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
        />
        {open ? (
          <span className="user-hits">
            <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => choose("", "")}>בלי משתמש</button>
            {hits.map((user) => (
              <button type="button" key={user.id} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(String(user.id), user.name || user.email)}>
                {user.name || user.email}
              </button>
            ))}
          </span>
        ) : null}
      </form>
    </span>
  );
}
