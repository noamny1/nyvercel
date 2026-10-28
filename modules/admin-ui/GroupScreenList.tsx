"use client";

import { useState } from "react";

type Row = {
  id: number;
  code: number | null;
  label: string;
  street: string;
  number: string;
  city: string;
  floor: string;
  shared?: boolean;
};

export function GroupScreenList({
  groupId,
  owner,
  rows,
  others,
  moveAddress,
  deleteAddress,
  saveOrder,
}: {
  groupId: number;
  owner: boolean;
  rows: Row[];
  others: { id: number; name: string }[];
  moveAddress: (formData: FormData) => void;
  deleteAddress: (formData: FormData) => void;
  saveOrder: (formData: FormData) => void;
}) {
  const [order, setOrder] = useState(rows);
  const [query, setQuery] = useState("");
  const [dragId, setDragId] = useState<number | null>(null);
  const needle = query.trim().toLowerCase();
  const shown = order.filter((row) => {
    const text = `${row.code || row.id} ${row.label} ${row.floor}`.toLowerCase();
    return !needle || text.includes(needle);
  });

  function dropOn(targetId: number) {
    if (dragId == null || dragId === targetId) return;
    const visible = new Set(shown.map((row) => row.id));
    const moving = shown.map((row) => row.id);
    const from = moving.indexOf(dragId);
    const to = moving.indexOf(targetId);
    if (from < 0 || to < 0) return;
    moving.splice(from, 1);
    moving.splice(to, 0, dragId);
    let index = 0;
    const nextIds = order.map((row) => (visible.has(row.id) ? moving[index++] : row.id));
    const byId = new Map(order.map((row) => [row.id, row]));
    const next = nextIds.map((id) => byId.get(id)).filter((row): row is Row => Boolean(row));
    setOrder(next);
    setDragId(null);
    const body = new FormData();
    body.set("groupId", String(groupId));
    next.forEach((row) => body.append("id", String(row.id)));
    void saveOrder(body);
  }

  return (
    <>
      <label className="group-search">חיפוש מסך
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="כתובת, קומה או מספר מסך" />
      </label>
      {shown.length === 0 ? <p>{order.length ? "אין מסך שמתאים לחיפוש." : "אין עדיין כתובת בקבוצה. יוצרים כתובת בלשונית בניינים ומשייכים אותה לכאן."}</p> : null}
      <div className="screens">
        {shown.map((screen) => (
          <div
            key={screen.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => dropOn(screen.id)}
          >
            <span className="screen-title">
              <span className="screen-line">
                <button
                  type="button"
                  className="drag-handle"
                  draggable
                  aria-label="גרירת הסדר"
                  onDragStart={() => setDragId(screen.id)}
                  onDragEnd={() => setDragId(null)}
                >☰</button>
                מסך {screen.code || screen.id}
              </span>
              <small>{screen.label} · {screen.floor}</small>
            </span>
            <span className="screen-actions">
              <a href={`/s/${screen.code || screen.id}`} target="_blank">פתיחה</a>
              {owner && others.length > 0 && !screen.shared ? (
                <form action={moveAddress}>
                  <input type="hidden" name="screenId" value={screen.id} />
                  <input type="hidden" name="groupId" value={groupId} />
                  <input type="hidden" name="label" value={screen.label} />
                  <input type="hidden" name="street" value={screen.street} />
                  <input type="hidden" name="number" value={screen.number} />
                  <input type="hidden" name="city" value={screen.city} />
                  <select name="targetGroupId" defaultValue="" aria-label="קבוצה אחרת">
                    <option value=""></option>
                    {others.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  <button className="light" type="submit">העברה</button>
                </form>
              ) : null}
              {owner ? (
                <form action={deleteAddress}>
                  <input type="hidden" name="screenId" value={screen.id} />
                  <input type="hidden" name="groupId" value={groupId} />
                  <input type="hidden" name="label" value={screen.label} />
                  {screen.shared ? <input type="hidden" name="unlink" value="1" /> : null}
                  <button className="light" type="submit">{screen.shared ? "הסרה" : "מחיקה"}</button>
                </form>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
