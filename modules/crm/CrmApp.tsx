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
  { title: "פרטים", keys: ["שם", "עיר", "סטטוס", "סוג לקוח", "תימה"] },
  { title: "עבודה", keys: ["תכולת העבודה", "הערות"] },
  { title: "חיוב", keys: ["חיוב חד פעמי", "תשלום חודשי", "תשלום חודשי 2", "הוצאה חודשית קו אינטרנט", "אמצעי תשלום", "שולם עד"] },
  { title: "התקנה", keys: ["תשתית", "תאריך התקנה", "מספר קו הוט/בזק", "מס' מסכים בבניין", "מס' כתובות לתשלום"] },
  { title: "חיבור", keys: ["IP/DNS", "User", "Pass", "נתוני מודם/סים", "מס מנוי", "סיסמא מודם", "סוג DVR", "Ip Dvr", "Ports", "User Dvr", "Pass Dvr"] },
];

function isCity(value: string) {
  return !/\d|שח|הרשא|ביטול|סכום|מסב|לחייב|חיייב|חן /.test(value);
}

const CHOICE_FIELDS = ["עיר", "סטטוס", "סוג לקוח", "תימה", "אמצעי תשלום", "תשתית"];

const TASKS = ["משימות נירית", "משימות נועם", "משימות יובל"];
const HISTORY = "היסטורית משימות";
function place(row: CrmRow) {
  if (TASKS.includes(row.board) && row.fields["סטטוס משימה"] === "נסגרה") return HISTORY;
  return row.board;
}
const BILLING = ["חיוב מס\"ב 16 לחודש", "הוראות קבע וועד", "העברות בנקאיות חברות ניהול", "ארנון תשלומים"];
const HIDDEN = new Set<string>([...TASKS, ...BILLING]);
const BILLING_LABEL: Record<string, string> = {
  "חיוב מס\"ב 16 לחודש": "מס\"ב 16",
  "הוראות קבע וועד": "הוראות קבע",
  "העברות בנקאיות חברות ניהול": "העברות בנקאיות",
  "ארנון תשלומים": "ארנון תשלומים",
};

const ADDRESS = new Set<string>([
  "משימות נירית",
  "משימות נועם",
  "משימות יובל",
  "הזמנות חדשות-ומשימות",
  "חיוב חד פעמי",
  "חיוב מס\"ב 16 לחודש",
  "ניתוקים",
  "כתובות פעילות",
]);

function keysFor(board: string, fields: Record<string, string>) {
  const base = BOARD_FIELDS[board]?.length ? BOARD_FIELDS[board] : BOARD_FIELDS["משימות נירית"] || [];
  const extra = Object.keys(fields).filter((key) => key !== "Name" && !base.includes(key));
  return [...base, ...extra];
}

function sections(keys: string[]) {
  const used = new Set<string>();
  const out = GROUPS.map((group) => {
    const picked = group.keys.filter((key) => key === "שם" || keys.includes(key));
    picked.forEach((key) => used.add(key));
    return { title: group.title, keys: picked };
  }).filter((group) => group.keys.length);
  const rest = keys.filter((key) => !used.has(key));
  if (rest.length) out.push({ title: "תשלומים", keys: rest });
  return out;
}

export function CrmApp({ rows }: { rows: CrmRow[] }) {
  const [items, setItems] = useState(rows);
  const [board, setBoard] = useState<string>("כתובות פעילות");
  const [openMenu, setOpenMenu] = useState<"" | "tasks" | "billing">("");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(40);
  const [editing, setEditing] = useState<CrmRow | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [draftBoard, setDraftBoard] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [addedChoices, setAddedChoices] = useState<Record<string, string[]>>({});

  const choices = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const key of CHOICE_FIELDS) {
      const values = new Set<string>(addedChoices[key] || []);
      for (const row of items) {
        const value = (row.fields[key] || "").trim();
        if (!value || (key === "עיר" && !isCity(value))) continue;
        values.add(value);
      }
      map[key] = Array.from(values).sort((a, b) => a.localeCompare(b, "he"));
    }
    return map;
  }, [items, addedChoices]);

  const counts = useMemo(() => {
    const map = Object.fromEntries(BOARDS.map((name) => [name, 0]));
    for (const row of items) {
      const name = place(row);
      map[name] = (map[name] || 0) + 1;
    }
    return map;
  }, [items]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = items.filter((row) => {
      if (place(row) !== board) return false;
      if (!needle) return true;
      return `${row.name} ${Object.values(row.fields).join(" ")}`.toLowerCase().includes(needle);
    });
    if (board === HISTORY) {
      return rows.sort((a, b) => (b.fields["תאריך סגירה"] || "").localeCompare(a.fields["תאריך סגירה"] || ""));
    }
    if (TASKS.includes(board)) {
      return rows.sort((a, b) => (b.fields["תאריך פתיחה"] || "").localeCompare(a.fields["תאריך פתיחה"] || ""));
    }
    return rows;
  }, [items, board, query]);

  function open(row: CrmRow) {
    setEditing(row);
    setDraft({ ...row.fields, Name: row.name });
    setDraftBoard(row.board);
    setNote("");
  }

  function create() {
    const task = TASKS.includes(board) || openMenu === "tasks";
    const target = task ? (TASKS.includes(board) ? board : TASKS[0]) : board;
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
    setEditing({ id: 0, board: target, name: "", fields: {} });
    setDraft(task ? { Name: "", "תאריך פתיחה": today } : { Name: "" });
    setDraftBoard(target);
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
    const task = TASKS.includes(draftBoard) || draftBoard === HISTORY;
    const fields = task
      ? {
          ...(editing.fields || {}),
          Name: name,
          "עיר": draft["עיר"] || "",
          "תכולת העבודה": draft["תכולת העבודה"] || "",
          "הערות": draft["הערות"] || "",
          "תאריך פתיחה": draft["תאריך פתיחה"] || "",
          "סטטוס משימה": draft["סטטוס משימה"] || "",
          "תאריך סגירה": draft["תאריך סגירה"] || "",
          "נסגר על ידי": draft["נסגר על ידי"] || "",
        }
      : { ...draft, Name: name };
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
    const next: CrmRow = { id: editing.id || body.id, board: draftBoard, name, fields: payload.fields };
    setItems((current) => editing.id ? current.map((row) => row.id === editing.id ? next : row) : [next, ...current]);
    setEditing(null);
    if (draftBoard !== board) setBoard(draftBoard);
  }

  async function closeTask() {
    if (!editing?.id) return;
    const name = (draft.Name || "").trim();
    if (!name) {
      setNote("צריך שם");
      return;
    }
    const who = draftBoard.replace("משימות ", "");
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
    const fields = {
      ...(editing.fields || {}),
      Name: name,
      "עיר": draft["עיר"] || "",
      "תכולת העבודה": draft["תכולת העבודה"] || "",
      "הערות": draft["הערות"] || "",
      "תאריך פתיחה": draft["תאריך פתיחה"] || "",
      "סטטוס משימה": "נסגרה",
      "תאריך סגירה": today,
      "נסגר על ידי": who,
    };
    setBusy(true);
    setNote("");
    const saved = await fetch(`/api/crm/clients/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, board: HISTORY, fields }),
    });
    if (!saved.ok) {
      setBusy(false);
      setNote("הסגירה נכשלה");
      return;
    }
    setBusy(false);
    const next: CrmRow = { id: editing.id, board: HISTORY, name, fields };
    setItems((current) => current.map((row) => (row.id === editing.id ? next : row)));
    setEditing(null);
    setBoard(HISTORY);
    setOpenMenu("tasks");
    setNote("המשימה עברה להיסטוריה");
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
  const taskMode = TASKS.includes(board) || openMenu === "tasks";
  const editingTask = Boolean(editing && (TASKS.includes(draftBoard) || draftBoard === HISTORY));
  const newLabel = taskMode ? "משימה חדשה" : ADDRESS.has(board) ? "כתובת חדשה" : "לקוח חדש";

  return (
    <div className="crm-app" dir="rtl">
      <header className="crm-top">
        <div className="crm-top-row">
          <h1>CRM</h1>
          <div className="crm-top-links">
            <a className="crm-backup" href="/api/crm/export">גיבוי לאקסל</a>
            <a href="/admin">לניהול המסכים</a>
          </div>
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
        <button
          type="button"
          className={board === "כתובות פעילות" ? "board-chip on" : "board-chip"}
          onClick={() => {
            setBoard("כתובות פעילות");
            setOpenMenu("");
            setShown(40);
          }}
        >
          כתובות פעילות <b>{counts["כתובות פעילות"] || 0}</b>
        </button>
        <button
          type="button"
          className={TASKS.includes(board) || board === HISTORY ? "board-chip on" : "board-chip"}
          onClick={() => setOpenMenu((open) => open === "tasks" ? "" : "tasks")}
        >
          משימות <b>{TASKS.reduce((sum, name) => sum + (counts[name] || 0), 0)}</b>
        </button>
        {BOARDS.filter((name) => !HIDDEN.has(name) && name !== "כתובות פעילות").map((name) => (
          <span key={name} className="board-slot">
            <button
              type="button"
              className={name === board ? "board-chip on" : "board-chip"}
              onClick={() => {
                setBoard(name);
                setOpenMenu("");
                setShown(40);
              }}
            >
              {name} <b>{counts[name] || 0}</b>
            </button>
            {name === "חיוב חד פעמי" ? (
              <button
                type="button"
                className={BILLING.includes(board) ? "board-chip on" : "board-chip"}
                onClick={() => setOpenMenu((open) => open === "billing" ? "" : "billing")}
              >
                גבייה <b>{BILLING.reduce((sum, item) => sum + (counts[item] || 0), 0)}</b>
              </button>
            ) : null}
          </span>
        ))}
      </div>
      {openMenu === "tasks" ? (
        <div className="board-row task-row">
          {TASKS.map((name) => (
            <button
              key={name}
              type="button"
              className={name === board ? "board-chip on" : "board-chip"}
              onClick={() => {
                setBoard(name);
                setShown(40);
              }}
            >
              {name.replace("משימות ", "")} <b>{counts[name] || 0}</b>
            </button>
          ))}
          <button
            type="button"
            className={board === HISTORY ? "board-chip on" : "board-chip"}
            onClick={() => {
              setBoard(HISTORY);
              setShown(40);
            }}
          >
            היסטורית משימות <b>{counts[HISTORY] || 0}</b>
          </button>
        </div>
      ) : null}
      {openMenu === "billing" ? (
        <div className="board-row task-row">
          {BILLING.map((name) => (
            <button
              key={name}
              type="button"
              className={name === board ? "board-chip on" : "board-chip"}
              onClick={() => {
                setBoard(name);
                setShown(40);
              }}
            >
              {BILLING_LABEL[name]} <b>{counts[name] || 0}</b>
            </button>
          ))}
        </div>
      ) : null}
      <div className="crm-list">
        {board === HISTORY ? (
          <div className="crm-head task">
            <span>שם</span>
            <span>עיר</span>
            <span>תכולת עבודה</span>
            <span>נסגר על ידי</span>
            <span>תאריך סגירה</span>
          </div>
        ) : taskMode && TASKS.includes(board) ? (
          <div className="crm-head task">
            <span>שם</span>
            <span>עיר</span>
            <span>תכולת עבודה</span>
            <span>הערות</span>
            <span>תאריך פתיחה</span>
          </div>
        ) : (
          <div className="crm-head">
            <span>כתובת</span>
            <span>עיר</span>
            <span>סוג לקוח</span>
            <span>הערות</span>
            <span>תשלום</span>
            <span>סטטוס</span>
          </div>
        )}
        {visible.slice(0, shown).map((row) => {
          if (place(row) === HISTORY) {
            return (
              <button key={row.id} type="button" className="crm-line task" onClick={() => open(row)}>
                <strong className="crm-name">{row.name}</strong>
                <span>{row.fields["עיר"]}</span>
                <span className="crm-note-line">{row.fields["תכולת העבודה"]}</span>
                <span>{row.fields["נסגר על ידי"]}</span>
                <span>{row.fields["תאריך סגירה"]}</span>
              </button>
            );
          }
          if (TASKS.includes(row.board)) {
            return (
              <button key={row.id} type="button" className="crm-line task" onClick={() => open(row)}>
                <strong className="crm-name">{row.name}</strong>
                <span>{row.fields["עיר"]}</span>
                <span className="crm-note-line">{row.fields["תכולת העבודה"]}</span>
                <span className="crm-note-line">{row.fields["הערות"]}</span>
                <span>
                  {row.fields["תאריך פתיחה"]}
                  {row.fields["סטטוס משימה"] === "נסגרה" ? <i className="crm-pill ok">נסגרה</i> : null}
                </span>
              </button>
            );
          }
          const city = row.fields["עיר"];
          const kind = row.fields["סוג לקוח"];
          const status = row.fields["סטטוס"];
          const pay = row.fields["תשלום חודשי"] || row.fields["סכום"] || row.fields["סכום אפריל"];
          const extra = row.fields["הערות"] || row.fields["תכולת העבודה"];
          const tone = /פעיל|בוצע|שולם/.test(status || "") ? "ok" : /סירוב|ניתוק|לא שולם|החזר/.test(status || "") ? "bad" : "wait";
          return (
            <button key={row.id} type="button" className="crm-line" onClick={() => open(row)}>
              <strong className="crm-name">{row.name}</strong>
              <span>{city}</span>
              <span>{kind}</span>
              <span className="crm-note-line">{extra}</span>
              <span className="crm-pay">{pay ? `₪ ${pay}` : ""}</span>
              {status ? <i className={`crm-pill ${tone}`}>{status}</i> : <span />}
            </button>
          );
        })}
        {!visible.length && <p className="crm-empty">אין רשומות בלשונית הזו</p>}
      </div>
      {shown < visible.length && (
        <button type="button" className="crm-more" onClick={() => setShown((count) => count + 40)}>
          עוד {Math.min(40, visible.length - shown)}
        </button>
      )}
      <button type="button" className="crm-fab" onClick={create}>{newLabel}</button>
      {editing && (
        <div className="crm-editor">
          <div className="crm-hero">
            <p>{editingTask ? (editing.id ? "עריכת משימה" : "משימה חדשה") : (editing.id ? "עריכת כתובת" : newLabel)}</p>
            <h2>{draft.Name || (editingTask ? "משימה חדשה" : "כתובת חדשה")}</h2>
            <div className="crm-hero-pills">
              {editingTask ? (
                <>
                  {draft["עיר"] ? <span>{draft["עיר"]}</span> : null}
                  {draft["תאריך פתיחה"] ? <span>{draft["תאריך פתיחה"]}</span> : null}
                </>
              ) : (
                <>
                  {draft["עיר"] ? <span>{draft["עיר"]}</span> : null}
                  {draft["סטטוס"] ? <span className={/פעיל|בוצע|שולם/.test(draft["סטטוס"]) ? "ok" : /סירוב|ניתוק|החזר/.test(draft["סטטוס"]) ? "bad" : "wait"}>{draft["סטטוס"]}</span> : null}
                  {draft["תשלום חודשי"] ? <span className="pay">₪ {draft["תשלום חודשי"]}</span> : null}
                </>
              )}
            </div>
          </div>
          {editingTask ? (
            <div className="crm-group" data-tone="עבודה">
              {draftBoard === HISTORY ? (
                <>
                  <label className="crm-field">
                    נסגר על ידי
                    <input value={draft["נסגר על ידי"] || ""} readOnly />
                  </label>
                  <label className="crm-field">
                    תאריך סגירה
                    <input value={draft["תאריך סגירה"] || ""} readOnly />
                  </label>
                </>
              ) : (
                <label className="crm-field">
                  שייך ל
                  <select value={draftBoard} onChange={(event) => setDraftBoard(event.target.value)}>
                    {TASKS.map((name) => <option key={name} value={name}>{name.replace("משימות ", "")}</option>)}
                  </select>
                </label>
              )}
              <label className="crm-field">
                שם
                <input value={draft.Name || ""} onChange={(event) => setDraft({ ...draft, Name: event.target.value })} />
              </label>
              <label className="crm-field">
                עיר
                <input value={draft["עיר"] || ""} onChange={(event) => setDraft({ ...draft, "עיר": event.target.value })} />
              </label>
              <label className="crm-field">
                תכולת העבודה
                <textarea value={draft["תכולת העבודה"] || ""} onChange={(event) => setDraft({ ...draft, "תכולת העבודה": event.target.value })} />
              </label>
              <label className="crm-field">
                הערות
                <textarea value={draft["הערות"] || ""} onChange={(event) => setDraft({ ...draft, "הערות": event.target.value })} />
              </label>
              <label className="crm-field">
                תאריך פתיחה
                <input type="date" value={draft["תאריך פתיחה"] || ""} onChange={(event) => setDraft({ ...draft, "תאריך פתיחה": event.target.value })} />
              </label>
              <p className="crm-hint">אפשר למלא רק מה שצריך. המשימה לא מקושרת לכתובות ולשאר הלשוניות.</p>
              {editing.id && TASKS.includes(draftBoard) ? (
                <button type="button" className="crm-close-task" onClick={closeTask} disabled={busy}>
                  סגירת משימה
                </button>
              ) : null}
            </div>
          ) : (
          <>
          <label className="crm-field">
            לשונית
            <select value={draftBoard} onChange={(event) => setDraftBoard(event.target.value)}>
              {BOARDS.filter((name) => !TASKS.includes(name)).map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          {sections(formKeys).map((group) => (
            <details key={group.title} open={group.title !== "חיבור"} className="crm-group" data-tone={group.title}>
              <summary>
                <b>{group.title}</b>
                <i>{group.keys.filter((key) => (key === "שם" ? draft.Name || "" : draft[key] || "").trim()).length}/{group.keys.length}</i>
              </summary>
              {group.keys.map((key) => (
                <label key={key} className="crm-field">
                  {key}
                  {key === "שם" ? (
                    <input value={draft.Name || ""} onChange={(event) => setDraft({ ...draft, Name: event.target.value })} />
                  ) : CHOICE_FIELDS.includes(key) ? (
                    <ChoiceField
                      value={draft[key] || ""}
                      options={choices[key] || []}
                      includeValue={key !== "עיר" || isCity(draft[key] || "")}
                      onChange={(value) => setDraft((current) => ({ ...current, [key]: value }))}
                      onAdd={(value) => {
                        setAddedChoices((current) => ({
                          ...current,
                          [key]: Array.from(new Set([...(current[key] || []), value])),
                        }));
                        setDraft((current) => ({ ...current, [key]: value }));
                      }}
                    />
                  ) : (draft[key] || "").length > 40 || key.includes("הערות") || key.includes("תכול") ? (
                    <textarea value={draft[key] || ""} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
                  ) : (
                    <input value={draft[key] || ""} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
                  )}
                </label>
              ))}
            </details>
          ))}
          </>
          )}
          {note && <p className="crm-note">{note}</p>}
          <div className={editing.id ? "crm-editor-actions" : "crm-editor-actions two"}>
            <button type="button" className="crm-ghost" onClick={() => setEditing(null)}>סגור</button>
            {editing.id ? <button type="button" className="crm-delete" onClick={remove}>מחיקה</button> : null}
            <button type="button" className="crm-save" onClick={save} disabled={busy}>{busy ? "שומר" : "שמירה"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChoiceField({
  value,
  options,
  includeValue = true,
  onChange,
  onAdd,
}: {
  value: string;
  options: string[];
  includeValue?: boolean;
  onChange: (value: string) => void;
  onAdd: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState("");
  const list = includeValue && value && !options.includes(value) ? [value, ...options] : options;
  return (
    <span className="crm-choice">
      <button type="button" className={open ? "crm-choice-btn is-open" : "crm-choice-btn"} onClick={() => { setOpen((current) => !current); setAdding(false); }}>
        {value || "בחירה"}
      </button>
      {open ? (
        <span className="crm-choice-menu">
          <span className="crm-choice-options">
            <button type="button" onClick={() => { onChange(""); setOpen(false); }}>בחירה</button>
            {list.map((option) => (
              <button key={option} type="button" className={option === value ? "is-on" : undefined} onClick={() => { onChange(option); setOpen(false); }}>
                {option}
              </button>
            ))}
          </span>
          <button type="button" className="crm-choice-add" onClick={() => setAdding(true)}>הוספת ערך חדש</button>
          {adding ? (
            <span className="crm-add-choice">
              <input value={custom} placeholder="ערך חדש" autoFocus onChange={(event) => setCustom(event.target.value)} />
              <button
                type="button"
                onClick={() => {
                  const next = custom.trim();
                  if (!next) return;
                  onAdd(next);
                  setCustom("");
                  setAdding(false);
                  setOpen(false);
                }}
              >
                הוסף
              </button>
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
