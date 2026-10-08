"use client";

import { useState, useTransition } from "react";
import { runSystemAgentAction } from "@/app/admin/agent/actions";
import type { AgentReport } from "@/lib/system-agent";

const LEVEL = { high: "חשוב", mid: "שיפור", ok: "תקין" };

export function SystemAgent() {
  const [report, setReport] = useState<AgentReport | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <section className="card agent-run">
      <h2>סוכן המערכת</h2>
      <p>בודק אבטחה וביצועים של הניהול, האתר השיווקי והמסכים אצל הלקוחות. הבדיקה לא משנה שום הגדרה.</p>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError("");
          start(async () => {
            try {
              setReport(await runSystemAgentAction());
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : "הבדיקה נכשלה");
            }
          });
        }}
      >
        {pending ? "הסוכן בודק..." : "הפעלת הסוכן"}
      </button>
      {error ? <p className="error">{error}</p> : null}
      {report ? (
        <div className="agent-report">
          <p className="agent-meta">{report.at} · {report.summary}</p>
          {report.findings.map((item) => (
            <article key={`${item.area}-${item.title}`} className={`agent-finding is-${item.level}`}>
              <small>{item.area} · {LEVEL[item.level]}</small>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
