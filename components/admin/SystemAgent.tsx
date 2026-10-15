"use client";

import { useState, useTransition } from "react";
import { closeOpenLink, listOpenLinks, runResourceCheckAction, runSystemAgentAction, type OpenLink } from "@/app/admin/agent/actions";
import type { AgentReport } from "@/lib/system-agent";

const LEVEL = { high: "חשוב", mid: "שיפור", ok: "תקין" };

export function SystemAgent() {
  const [report, setReport] = useState<AgentReport | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [resources, setResources] = useState<string[]>([]);
  const [resourceNote, setResourceNote] = useState("");
  const [resourceError, setResourceError] = useState("");
  const [checkingResources, setCheckingResources] = useState(false);
  const [links, setLinks] = useState<OpenLink[] | null>(null);
  const [linkError, setLinkError] = useState("");
  const [checking, setChecking] = useState(false);
  const [closing, setClosing] = useState(0);

  async function checkLinks() {
    setLinkError("");
    setChecking(true);
    try {
      setLinks(await listOpenLinks());
    } catch (reason) {
      setLinkError(reason instanceof Error ? reason.message : "הבדיקה נכשלה");
    } finally {
      setChecking(false);
    }
  }

  async function closeLink(id: number) {
    setClosing(id);
    setLinkError("");
    try {
      await closeOpenLink(id);
      setLinks(await listOpenLinks());
    } catch (reason) {
      setLinkError(reason instanceof Error ? reason.message : "הסגירה נכשלה");
    } finally {
      setClosing(0);
    }
  }

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
      <h2>משאבי שרת ואחסון</h2>
      <p>אותה בדיקה שרצה כל יום בשעה 10:00. נשלח גם מייל עם הסטטוס וההמלצה.</p>
      <button
        type="button"
        disabled={checkingResources}
        onClick={() => {
          setResourceError("");
          setResourceNote("");
          setCheckingResources(true);
          void runResourceCheckAction()
            .then((result) => {
              setResources(result.lines);
              setResourceNote(result.mailed ? "המייל נשלח." : result.mailError || "המייל לא נשלח.");
            })
            .catch((reason) => setResourceError(reason instanceof Error ? reason.message : "הבדיקה נכשלה"))
            .finally(() => setCheckingResources(false));
        }}
      >
        {checkingResources ? "בודק משאבים..." : "בדיקת משאבי שרת ואחסון"}
      </button>
      {resourceError ? <p className="error">{resourceError}</p> : null}
      {resources.length ? (
        <div className="agent-report">
          {resources.map((line) => (
            <article key={line} className="agent-finding is-ok">
              <p>{line}</p>
            </article>
          ))}
          {resourceNote ? <p className="agent-meta">{resourceNote}</p> : null}
        </div>
      ) : null}
      <h2>חיבורי שליטה מרחוק</h2>
      <p>בודק אם יש כרגע חיבור פתוח לאחת הכתובות. אפשר לסגור אותו מכאן.</p>
      <button type="button" disabled={checking} onClick={() => void checkLinks()}>
        {checking ? "בודק חיבורים..." : "בדיקת חיבורים פתוחים"}
      </button>
      {linkError ? <p className="error">{linkError}</p> : null}
      {links ? (
        links.length ? (
          <div className="agent-report">
            {links.map((link) => (
              <article key={link.id} className="agent-finding is-high open-link">
                <strong>{link.label}</strong>
                <button type="button" disabled={closing === link.id} onClick={() => void closeLink(link.id)}>
                  {closing === link.id ? "סוגר..." : "סגירת חיבור"}
                </button>
              </article>
            ))}
          </div>
        ) : <p>אין כרגע חיבור שליטה מרחוק פתוח.</p>
      ) : null}
    </section>
  );
}
