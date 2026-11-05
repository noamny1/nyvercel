"use client";

import { useState } from "react";
import { moveListedScreen } from "@/app/admin/actions";

export function GroupMove({
  screenId,
  groupId,
  groups,
}: {
  screenId: number;
  groupId: number | null;
  groups: { id: number; name: string }[];
}) {
  const current = groupId ? String(groupId) : "";
  const [value, setValue] = useState(current);
  const [logoChoice, setLogoChoice] = useState("");
  const changed = value !== current;
  const joining = changed && value !== "";
  const ready = changed && (!joining || logoChoice === "group" || logoChoice === "keep");

  return (
    <form className="group-move" action={moveListedScreen}>
      <input type="hidden" name="id" value={screenId} />
      <select name="groupId" value={value} aria-label="קבוצה" onChange={(event) => { setValue(event.target.value); setLogoChoice(""); }}>
        <option value="">בלי קבוצה</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>{group.name}</option>
        ))}
      </select>
      {joining ? (
        <select className="logo-choice" name="logoChoice" aria-label="האם להחליף את הלוגו" value={logoChoice} required onChange={(event) => setLogoChoice(event.target.value)}>
          <option value="">האם להחליף את הלוגו?</option>
          <option value="group">כן, ללוגו הקבוצה</option>
          <option value="keep">לא, להשאיר את הלוגו של הכתובת</option>
        </select>
      ) : null}
      <button className={ready ? "ready" : "light"} type="submit" disabled={!ready}>העברה</button>
    </form>
  );
}
