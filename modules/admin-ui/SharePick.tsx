"use client";

import { useState } from "react";

export function SharePick({
  screenId,
  field,
  options,
  selected,
  primary,
  empty,
  action,
  returnTo,
}: {
  screenId: number;
  field: "groupId" | "userId";
  options: { id: number; label: string }[];
  selected: number[];
  primary?: number | null;
  empty: string;
  action: (formData: FormData) => void;
  returnTo: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(selected);
  const [main, setMain] = useState(primary && selected.includes(primary) ? primary : selected[0] || 0);
  const needle = query.trim().toLowerCase();
  const shown = options.filter((option) => !needle || option.label.toLowerCase().includes(needle));
  const labels = options
    .filter((option) => picked.includes(option.id))
    .sort((a, b) => Number(b.id === main) - Number(a.id === main))
    .map((option) => option.label);
  const same = picked.length === selected.length && picked.every((id) => selected.includes(id)) && (field !== "groupId" || main === (primary || 0) || (!main && !primary));
  const summary = labels.length === 0 ? empty : labels.length <= 2 ? labels.join(" · ") : `${labels[0]} ועוד ${labels.length - 1}`;

  function toggle(id: number) {
    setPicked((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      if (field === "groupId" && !next.includes(main)) setMain(next[0] || 0);
      return next;
    });
  }

  return (
    <form className="share-pick" action={action}>
      <input type="hidden" name="id" value={screenId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {picked.map((id) => <input key={id} type="hidden" name={field} value={id} />)}
      {field === "groupId" ? <input type="hidden" name="primaryGroup" value={main || ""} /> : null}
      <button type="button" className="share-summary" onClick={() => setOpen((value) => !value)}>{summary}</button>
      {open ? (
        <div className="share-menu">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש" aria-label="חיפוש" />
          {shown.length === 0 ? <p>אין התאמה.</p> : null}
          {shown.map((option) => (
            <div key={option.id}>
              <label>
                <input type="checkbox" checked={picked.includes(option.id)} onChange={() => toggle(option.id)} />
                <span>{option.label}</span>
              </label>
              {field === "groupId" ? (
                <label className="share-main">
                  <input
                    type="radio"
                    name={`primary-${screenId}`}
                    checked={main === option.id}
                    disabled={!picked.includes(option.id)}
                    onChange={() => setMain(option.id)}
                  />
                  ראשית
                </label>
              ) : null}
            </div>
          ))}
          <button className={same ? "light" : "ready"} type="submit" disabled={same}>שמירה</button>
        </div>
      ) : null}
    </form>
  );
}
