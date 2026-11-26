"use client";

import { useMemo, useState } from "react";
import { BOARD_FIELDS, BOARDS } from "@/modules/crm/boards";
import type { CrmRow } from "@/modules/crm/CrmApp";

const GROUPS = [
  { title: "פרטים", keys: ["עיר", "סטטוס", "סוג לקוח", "תימה"] },
  { title: "חיוב", keys: ["חיוב חד פעמי", "תשלום חודשי", "תשלום חודשי 2", "הוצאה חודשית קו אינטרנט", "אמצעי תשלום", "שולם עד"] },
  { title: "עבודה", keys: ["תכולת העבודה", "הערות"] },
  { title: "התקנה", keys: ["תשתית", "תאריך התקנה", "מספר קו הוט/בזק", "מס' מסכים בבניין", "מס' כתובות לתשלום"] },
  { title: "חיבור", keys: ["IP/DNS", "User", "Pass", "נתוני מודם/סים", "מס מנוי", "סיסמא מודם", "סוג DVR", "Ip Dvr", "Ports", "User Dvr", "Pass Dvr"] },
];

const TASKS = ["משימות נועם", "משימות יובל", "משימות נירית"] as const;
const LEDGERS = ["הוראות קבע וועד", "העברות בנקאיות חברות ניהול", "ארנון תשלומים"];

const ALERTS = [
  { id: "refusal", title: "סירוב אשראי", test: (row: CrmRow) => (row.fields["סטטוס"] || "").includes("סירוב") },
  { id: "masav", title: "החזר מס\"ב", test: (row: CrmRow) => (row.fields["סטטוס"] || "").includes("החזר") },
  { id: "waitnet", title: "ממתין לאינטרנט", test: (row: CrmRow) => (row.fields["סטטוס"] || "").includes("ממתין לאינטרנט") },
  { id: "disconnect", title: "ניתוקים", test: (row: CrmRow) => row.board === "ניתוקים" || (row.fields["סטטוס"] || "").includes("ניתוק") },
];

function keysFor(board: string, fields: Record<string, string>) {
  const base = BOARD_FIELDS[board]?.length ? BOARD_FIELDS[board] : BOARD_FIELDS["משימות נירית"] || [];
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

function openTask(row: CrmRow) {
  return !(row.fields["סטטוס"] || "").includes("בוצע");
}

export function CrmWork({ rows }: { rows: CrmRow[] }) {
  const [items, setItems] = useState(rows);
  const [view, setView] = useState<"today" | "tasks" | "search" | "ledger">("today");
  const [query, setQuery] = useState("");
  const [taskBoard, setTaskBoard] = useState<string>(TASKS[0]);
  const [ledger, setLedger] = useState(LEDGERS[0]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<CrmRow | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [draftBoard, setDraftBoard] = useState("כתובות פעילות");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const needle = query.trim().toLowerCase();

  const alerts = useMemo(() => {
    return ALERTS.map((alert) => ({
      ...alert,
      rows: items.filter((row) => alert.test(row) && (!needle || `${row.name} ${row.fields["עיר"] || ""}`.toLowerCase().includes(needle))),
    })).filter((alert) => alert.rows.length);
  }, [items, needle]);

  const taskRows = items.filter((row) => row.board === taskBoard && openTask(row));
  const searchRows = needle.length >= 2
    ? items.filter((row) => `${row.name} ${row.board} ${Object.values(row.fields).join(" ")}`.toLowerCase().includes(needle)).slice(0, 40)
    : [];
  const ledgerRows = items.filter((row) => row.board === ledger);

  function open(row: CrmRow) {
    setEditing(row);
    setDraft({ ...row.fields, Name: row.name });
    setDraftBoard(row.board);
    setNote("");
  }

  function create(board = "כתובות פעילות") {
    setEditing({ id: 0, board, name: "", fields: {} });
    setDraft({ Name: "" });
    setDraftBoard(board);
    setNote("");
  }

  async function save(done = false) {
    if (!editing) return;
    const name = (draft.Name || "").trim();
    if (!name) {
      setNote("צריך שם");
      return;
    }
    const fields: Record<string, string> = { ...draft, Name: name };
    if (done) fields["סטטוס"] = "בוצע";
    setBusy(true);
    setNote("");
    const payload = { name, board: draftBoard, fields };
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
    const next: CrmRow = { id: editing.id || body.id, board: draftBoard, name, fields };
    setItems((current) => editing.id ? current.map((row) => row.id === editing.id ? next : row) : [next, ...current]);
    setEditing(null);
  }

  async function markDone(row: CrmRow) {
    const fields = { ...row.fields, סטטוס: "בוצע" };
    const response = await fetch(`/api/crm/clients/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: row.name, board: row.board, fields }),
    });
    if (!response.ok) return;
    setItems((current) => current.map((item) => item.id === row.id ? { ...item, fields } : item));
  }

  const formKeys = editing ? keysFor(draftBoard, draft) : [];

  return (
    <div className="crm-app crm-work" dir="rtl">
      <header className="crm-top">
        <div className="crm-top-row">
          <h1>CRM</h1>
          <span className="crm-links">
            <a href="/admin">לניהול המסכים</a>
            <a href="/admin/crm?view=classic">התצוגה הקודמת</a>
          </span>
        </div>
        <input
          className="crm-search"
          value={query}
          placeholder="חיפוש כתובת, עיר או סטטוס"
          onChange={(event) => {
            setQuery(event.target.value);
            if (event.target.value.trim().length >= 2) setView("search");
          }}
        />
      </header>
      <div className="board-row">
        {([
          ["today", "היום"],
          ["tasks", "משימות"],
          ["search", "כתובות"],
          ["ledger", "תשלומים"],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" className={view === id ? "board-chip on" : "board-chip"} onClick={() => setView(id)}>{label}</button>
        ))}
      </div>

      {view === "today" && (
        <div className="crm-cards">
          {!alerts.length && <p className="crm-empty">אין כרגע פריטים לטיפול</p>}
          {alerts.map((alert) => {
            const shown = openSections[alert.id] ? alert.rows : alert.rows.slice(0, 6);
            return (
              <section key={alert.id} className="crm-section">
                <h2>{alert.title} <b>{alert.rows.length}</b></h2>
                {shown.map((row) => <Card key={row.id} row={row} onOpen={open} />)}
                {alert.rows.length > 6 && (
                  <button type="button" className="crm-more" onClick={() => setOpenSections((current) => ({ ...current, [alert.id]: !current[alert.id] }))}>
                    {openSections[alert.id] ? "פחות" : `עוד ${alert.rows.length - 6}`}
                  </button>
                )}
              </section>
            );
          })}
        </div>
      )}

      {view === "tasks" && (
        <div className="crm-cards">
          <div className="board-row">
            {TASKS.map((name) => (
              <button key={name} type="button" className={taskBoard === name ? "board-chip on" : "board-chip"} onClick={() => setTaskBoard(name)}>
                {name.replace("משימות ", "")} <b>{items.filter((row) => row.board === name && openTask(row)).length}</b>
              </button>
            ))}
          </div>
          {taskRows.map((row) => (
            <div key={row.id} className="crm-task">
              <Card row={row} onOpen={open} />
              <button type="button" className="crm-done" onClick={() => markDone(row)}>בוצע</button>
            </div>
          ))}
          {!taskRows.length && <p className="crm-empty">אין משימות פתוחות</p>}
          <button type="button" className="crm-more" onClick={() => create(taskBoard)}>משימה חדשה</button>
        </div>
      )}

      {view === "search" && (
        <div className="crm-cards">
          {needle.length < 2 && <p className="crm-empty">הקלידו לפחות שתי אותיות. הרשימה המלאה לא נטענת, כדי שהמסך יישאר מהיר.</p>}
          {searchRows.map((row) => <Card key={row.id} row={row} onOpen={open} showBoard />)}
          {needle.length >= 2 && !searchRows.length && <p className="crm-empty">לא נמצאו כתובות</p>}
          <button type="button" className="crm-more" onClick={() => create("כתובות פעילות")}>כתובת חדשה</button>
        </div>
      )}

      {view === "ledger" && (
        <div className="crm-cards">
          <div className="board-row">
            {LEDGERS.map((name) => (
              <button key={name} type="button" className={ledger === name ? "board-chip on" : "board-chip"} onClick={() => setLedger(name)}>
                {name} <b>{items.filter((row) => row.board === name).length}</b>
              </button>
            ))}
          </div>
          {ledgerRows.map((row) => <Card key={row.id} row={row} onOpen={open} />)}
          <button type="button" className="crm-more" onClick={() => create(ledger)}>רשומה חדשה</button>
        </div>
      )}

      {editing && (
        <div className="crm-editor">
          <div className="crm-editor-bar">
            <button type="button" onClick={() => setEditing(null)}>סגור</button>
            <strong>{editing.id ? "עריכה" : "חדש"}</strong>
            <button type="button" onClick={() => save(false)} disabled={busy}>{busy ? "שומר" : "שמירה"}</button>
          </div>
          <label>
            העברה ללשונית
            <select value={draftBoard} onChange={(event) => setDraftBoard(event.target.value)}>
              {BOARDS.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <p className="crm-hint">העברה מזיזה את הרשומה. היא לא משוכפלת.</p>
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
          {editing.id && TASKS.includes(draftBoard as typeof TASKS[number]) ? (
            <button type="button" className="crm-more" onClick={() => save(true)}>סמן כבוצע</button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Card({ row, onOpen, showBoard = false }: { row: CrmRow; onOpen: (row: CrmRow) => void; showBoard?: boolean }) {
  const city = row.fields["עיר"];
  const status = row.fields["סטטוס"];
  const pay = row.fields["תשלום חודשי"] || row.fields["סכום"] || row.fields["סכום אפריל"];
  const goal = row.fields["תכולת העבודה"] || row.fields["הערות"];
  const when = row.fields["תאריך התקנה"];
  const tone = /פעיל|בוצע|שולם/.test(status || "") ? "ok" : /סירוב|ניתוק|לא שולם|החזר/.test(status || "") ? "bad" : "wait";
  return (
    <button type="button" className="crm-card" onClick={() => onOpen(row)}>
      <div className="crm-card-top">
        <strong className="crm-name">{row.name}</strong>
        {status ? <i className={`crm-pill ${tone}`}>{status}</i> : null}
      </div>
      <div className="crm-card-meta">
        <span>{[showBoard ? row.board : "", city, when].filter(Boolean).join(" · ")}</span>
        {pay ? <span className="crm-pay">₪ {pay}</span> : null}
      </div>
      {goal ? <p className="crm-note-line">{goal}</p> : null}
    </button>
  );
}
