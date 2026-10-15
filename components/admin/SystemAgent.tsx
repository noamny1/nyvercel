"use client";

import { useState, useTransition } from "react";
import { closeOpenLink, confirmBlobCleanupAction, listOpenLinks, previewBlobCleanupAction, runResourceCheckAction, runSystemAgentAction, type OpenLink } from "@/app/admin/agent/actions";
import type { UnusedFile } from "@/lib/blob-cleanup";
import type { AgentReport } from "@/lib/system-agent";

const LEVEL = { high: "חשוב", mid: "שיפור", ok: "תקין" };

function fileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} מ״ב`;
  if (bytes >= 1024) return `${Math.max(1, Math.round(bytes / 1024))} ק״ב`;
  return `${bytes} ב`;
}

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
  const [files, setFiles] = useState<UnusedFile[] | null>(null);
  const [filesMore, setFilesMore] = useState(false);
  const [fileError, setFileError] = useState("");
  const [scanningFiles, setScanningFiles] = useState(false);
  const [deletingFiles, setDeletingFiles] = useState(false);
  const [deletedCount, setDeletedCount] = useState<number | null>(null);

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
      <h2>ניקוי אחסון</h2>
      <p>מציג קבצים ישנים שאף מסך, קבוצה או שקף לא משתמש בהם. שום דבר לא נמחק לפני אישור.</p>
      <button
        type="button"
        disabled={scanningFiles || deletingFiles}
        onClick={() => {
          setFileError("");
          setDeletedCount(null);
          setScanningFiles(true);
          void previewBlobCleanupAction()
            .then((result) => {
              setFiles(result.files);
              setFilesMore(result.more);
              if (result.missing) setFileError("אחסון הקבצים לא מחובר.");
            })
            .catch((reason) => setFileError(reason instanceof Error ? reason.message : "הבדיקה נכשלה"))
            .finally(() => setScanningFiles(false));
        }}
      >
        {scanningFiles ? "בודק קבצים..." : "בדיקת קבצים למחיקה"}
      </button>
      {fileError ? <p className="error">{fileError}</p> : null}
      {deletedCount !== null ? <p>נמחקו {deletedCount} קבצים.</p> : null}
      {files ? (
        files.length ? (
          <div className="agent-report">
            {files.map((file) => (
              <article key={file.path} className="agent-finding is-mid">
                <strong>{file.name}</strong>
                <p>{fileSize(file.bytes)} · לפני {file.days} ימים · לא מחובר לאף מסך</p>
              </article>
            ))}
            {filesMore ? <p className="agent-meta">יש עוד קבצים. אחרי המחיקה הזו אפשר לבדוק שוב.</p> : null}
            <button
              type="button"
              disabled={deletingFiles}
              onClick={() => {
                setFileError("");
                setDeletingFiles(true);
                void confirmBlobCleanupAction(files.map((file) => file.path))
                  .then((result) => {
                    setDeletedCount(result.deleted);
                    setFiles([]);
                    setFilesMore(false);
                  })
                  .catch((reason) => setFileError(reason instanceof Error ? reason.message : "המחיקה נכשלה"))
                  .finally(() => setDeletingFiles(false));
              }}
            >
              {deletingFiles ? "מוחק..." : `אישור מחיקה של ${files.length} קבצים`}
            </button>
          </div>
        ) : deletedCount === null ? <p>אין קבצים למחיקה.</p> : null
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
