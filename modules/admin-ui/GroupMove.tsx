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
  const changed = value !== current;

  return (
    <form className="group-move" action={moveListedScreen}>
      <input type="hidden" name="id" value={screenId} />
      <select name="groupId" value={value} aria-label="קבוצה" onChange={(event) => setValue(event.target.value)}>
        <option value="">בלי קבוצה</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>{group.name}</option>
        ))}
      </select>
      <button className={changed ? "ready" : "light"} type="submit" disabled={!changed}>העברה</button>
    </form>
  );
}
