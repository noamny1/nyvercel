"use client";

import { useMemo, useState } from "react";
import { BOARD_FIELDS, BOARDS } from "@/modules/crm/boards";

export type CrmRow = {
  id: number;
  board: string;
  name: string;
  fields: Record<string, string>;
};

const GROUPS = [
  { title: "פרטים", keys: ["עיר", "סטטוס", "סוג לקוח", "תימה"] },
  { title: "חיוב", keys: ["חיוב חד פעמי", "תשלום חודשי", "תשלום חודשי 2", "הוצאה חודשית קו אינטרנט", "אמצעי תשלום", "שולם עד"] },
  { title: "עבודה", keys: ["תכולת העבודה", "הערות"] },
  { title: "התקנה", keys: ["תשתית", "תאריך התקנה", "מספר קו הוט/בזק", "מס' מסכים בבניין", "מס' כתובות לתשלום"] },
  { title: "חיבור", keys: ["IP/DNS", "User", "Pass", "נתוני מודם/סים", "מס מנוי", "סיסמא מודם", "סוג DVR", "Ip Dvr", "Ports", "User Dvr", "Pass Dvr"] },
];

const ADDRESS = new Set<string>(BOARDS.slice(0, 6));

function keysFor(board: string, fields: Record<string, string>) {
  const base = BOARD_FIELDS[board] || [];
  const extra = Object.keys(fields).filter((key) => key !== "Name" && !base.includes(key));
  return [...base, ...extra];
}

function sections(keys: string[]) {
  const used = new Set<string>();
  const out = GROUPS.map((group) => {
    const picked = group.keys.filter((key) => keys.includes(key));
    picked.forEach((key) => used.add(key));
    return { title: group.title, keys: picked };
  }).filter((group) => group.keys.length);
  const rest = keys.filter((key) => !used.has(key));
  if (rest.length) out.push({ title: "תשלומים", keys: rest });
  return out;
}

export function CrmApp({ rows }: { rows: CrmRow[] }) {
  const [items, setItems] = useState(rows);
  const [board, setBoard] = useState<string>(BOARDS[5]);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(40);
  const [editing, setEditing] = useState<CrmRow | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [draftBoard, setDraftBoard] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const counts = useMemo(() => {
    const map = Object.fromEntries(BOARDS.map((name) => [name, 0]));
    for (const row of items) map[row.board] = (map[row.board] || 0) + 1;
    return map;
  }, [items]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((row) => {
      if (row.board !== board) return false;
      if (!needle) return true;
      return `${row.name} ${Object.values(row.fields).join(" ")}`.toLowerCase().includes(needle);
    });
  }, [items, board, query]);

  function open(row: CrmRow) {
    setEditing(row);
    setDraft({ ...row.fields, Name: row.name });
    setDraftBoard(row.board);
    setNote("");
  }

  function create() {
    const blank: CrmRow = { id: 0, board, name: "", fields: {} };
    setEditing(blank);
    setDraft({ Name: "" });
    setDraftBoard(board);
    setNote("");
  }

  async function save() {
    if (!editing) return;
    const name = (draft.Name || "").trim();
    if (!name) {
      setNote("צריך שם");
      return;
    }
    setBusy(true);
    setNote("");
    const payload = { name, board: draftBoard, fields: { ...draft, Name: name } };
    const response = await fetch(editing.id ? `/api/crm/clients/${editing.id}` : "/api/crm/clients", {
      method: editing.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!response.ok) {
      setNote("השמירה נכשלה");
      return;
    }
    const body = await response.json().catch(() => ({}));
    const next: CrmRow = { id: editing.id || body.id, board: draftBoard, name, fields: payload.fields };
    setItems((current) => editing.id ? current.map((row) => row.id === editing.id ? next : row) : [next, ...current]);
    setEditing(null);
    if (draftBoard !== board) setBoard(draftBoard);
  }

  async function remove() {
    if (!editing?.id || !window.confirm("למחוק את הרשומה?")) return;
    setBusy(true);
    const response = await fetch(`/api/crm/clients/${editing.id}`, { method: "DELETE" });
    setBusy(false);
    if (!response.ok) {
      setNote("המחיקה נכשלה");
      return;
    }
    setItems((current) => current.filter((row) => row.id !== editing.id));
    setEditing(null);
  }

  const formKeys = editing ? keysFor(draftBoard, draft) : [];
  const newLabel = ADDRESS.has(board) ? "כתובת חדשה" : "לקוח חדש";

  return (
    <div className="crm-app" dir="rtl">
      <header className="crm-top">
        <div className="crm-top-row">
          <h1>CRM</h1>
          <a href="/admin">לניהול המסכים</a>
        </div>
        <input
          className="crm-search"
          value={query}
          placeholder="חיפוש בלשונית"
          onChange={(event) => {
            setQuery(event.target.value);
            setShown(40);
          }}
        />
      </header>
      <div className="board-row">
        {BOARDS.map((name) => (
          <button
            key={name}
            type="button"
            className={name === board ? "board-chip on" : "board-chip"}
            onClick={() => {
              setBoard(name);
              setShown(40);
            }}
          >
            {name} <b>{counts[name] || 0}</b>
          </button>
        ))}
      </div>
      <div className="crm-cards">
        {visible.slice(0, shown).map((row) => {
          const city = row.fields["עיר"];
          const status = row.fields["סטטוס"];
          const pay = row.fields["תשלום חודשי"] || row.fields["סכום"] || row.fields["סכום אפריל"];
          const extra = row.fields["הערות"] || row.fields["תכולת העבודה"] || row.fields["סוג לקוח"];
          const tone = /פעיל|בוצע|שולם/.test(status || "") ? "ok" : /סירוב|ניתוק|לא שולם|החזר/.test(status || "") ? "bad" : "wait";
          return (
            <button key={row.id} type="button" className="crm-card" onClick={() => open(row)}>
              <div className="crm-card-top">
                <strong className="crm-name">{row.name}</strong>
                {status ? <i className={`crm-pill ${tone}`}>{status}</i> : null}
              </div>
              <div className="crm-card-meta">
                {city ? <span>{city}</span> : null}
                {pay ? <span className="crm-pay">₪ {pay}</span> : null}
              </div>
              {extra ? <p className="crm-note-line">{extra}</p> : null}
            </button>
          );
        })}
        {!visible.length && <p className="crm-empty">אין רשומות בלשונית הזו</p>}
        {shown < visible.length && (
          <button type="button" className="crm-more" onClick={() => setShown((count) => count + 40)}>
            עוד {Math.min(40, visible.length - shown)}
          </button>
        )}
      </div>
      <button type="button" className="crm-fab" onClick={create}>{newLabel}</button>
      {editing && (
        <div className="crm-editor">
          <div className="crm-editor-bar">
            <button type="button" onClick={() => setEditing(null)}>סגור</button>
            <strong>{editing.id ? "עריכה" : newLabel}</strong>
            <button type="button" onClick={save} disabled={busy}>{busy ? "שומר" : "שמירה"}</button>
          </div>
          <label>
            לשונית
            <select value={draftBoard} onChange={(event) => setDraftBoard(event.target.value)}>
              {BOARDS.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label>
            שם
            <input value={draft.Name || ""} onChange={(event) => setDraft({ ...draft, Name: event.target.value })} />
          </label>
          {sections(formKeys).map((group) => (
            <details key={group.title} open={group.title !== "חיבור"} className="crm-group">
              <summary>{group.title}</summary>
              {group.keys.map((key) => (
                <label key={key}>
                  {key}
                  {(draft[key] || "").length > 40 || key.includes("הערות") || key.includes("תכול") ? (
                    <textarea value={draft[key] || ""} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
                  ) : (
                    <input value={draft[key] || ""} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
                  )}
                </label>
              ))}
            </details>
          ))}
          {note && <p className="crm-note">{note}</p>}
          {editing.id ? <button type="button" className="crm-delete" onClick={remove}>מחיקה</button> : null}
        </div>
      )}
    </div>
  );
}
