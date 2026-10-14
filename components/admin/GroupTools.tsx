"use client";

import { useRef, useState } from "react";

type Client = { id: number; name: string; email: string };
type Member = { id: number; email: string };

export function GroupTools({
  groupId,
  logoUrl,
  promoUrl,
  members,
  clients,
  saveLogo,
  savePromo,
  saveUser,
  removeUser,
}: {
  groupId: number;
  logoUrl: string;
  promoUrl: string;
  members: Member[];
  clients: Client[];
  saveLogo: (formData: FormData) => void;
  savePromo: (formData: FormData) => void;
  saveUser: (formData: FormData) => void;
  removeUser: (formData: FormData) => void;
}) {
  const logoForm = useRef<HTMLFormElement>(null);
  const promoForm = useRef<HTMLFormElement>(null);
  const userForm = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState("");
  const [promoNote, setPromoNote] = useState("");
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

  async function onPromo(file: File) {
    setPromoNote("מעלה את הסרטון...");
    if (!file.name.toLowerCase().endsWith(".mp4") && file.type !== "video/mp4") {
      setPromoNote("יש להעלות קובץ MP4.");
      return;
    }
    if (file.size > 40 * 1024 * 1024) {
      setPromoNote("הקובץ גדול מדי. עד 40 מגה.");
      return;
    }
    const preview = document.createElement("video");
    preview.preload = "metadata";
    preview.src = URL.createObjectURL(file);
    const duration = await new Promise<number>((resolve) => {
      preview.onloadedmetadata = () => resolve(preview.duration || 0);
      preview.onerror = () => resolve(0);
    });
    URL.revokeObjectURL(preview.src);
    if (!duration || duration > 60) {
      setPromoNote("הסרטון צריך להיות עד 60 שניות.");
      return;
    }
    try {
      const { upload } = await import("@vercel/blob/client");
      const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/upload/client" });
      const form = promoForm.current;
      const url = form?.querySelector('input[name="url"]') as HTMLInputElement | null;
      const seconds = form?.querySelector('input[name="duration"]') as HTMLInputElement | null;
      if (url) url.value = blob.url;
      if (seconds) seconds.value = String(Math.max(8, Math.min(60, Math.round(duration))));
      form?.requestSubmit();
    } catch {
      setPromoNote("ההעלאה נכשלה.");
    }
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
      <form action={savePromo} ref={promoForm}>
        <input type="hidden" name="id" value={groupId} />
        <input type="hidden" name="url" value="" />
        <input type="hidden" name="duration" value="20" />
        {promoUrl ? <video src={promoUrl} muted playsInline /> : null}
        <label className="file-pick">
          {promoNote || (promoUrl ? "החלפת סרטון" : "סרטון תדמית")}
          <input
            type="file"
            accept="video/mp4"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void onPromo(file);
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
