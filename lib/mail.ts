type MailCard = { name: string; email: string; password: string; screens: string[] };

const LOGIN = "https://nytv.app/admin/login";

export function mailText(card: MailCard) {
  return [
    `שלום ${card.name || ""}`,
    "",
    "לחצו על הקישור והיכנסו:",
    LOGIN,
    `אימייל: ${card.email}`,
    `סיסמה: ${card.password}`,
    "",
    "המסכים:",
    ...(card.screens.length ? card.screens : ["לא שויכו מסכים"]),
    "",
    "אפשר לנהל רק את המסכים שמופיעים כאן.",
    "NYmedia",
  ].join("\n");
}

function mailHtml(card: MailCard) {
  const screens = (card.screens.length ? card.screens : ["לא שויכו מסכים"])
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
  return `<div dir="rtl" style="font-family:Calibri,Arial,sans-serif;color:#252525">
    <p>שלום ${escapeHtml(card.name || "")}</p>
    <p><a href="${LOGIN}">לחצו כאן לכניסה למסכים</a></p>
    <p>אימייל: ${escapeHtml(card.email)}<br>סיסמה: ${escapeHtml(card.password)}</p>
    <p>המסכים:</p>
    <ul>${screens}</ul>
    <p>אפשר לנהל רק את המסכים שמופיעים כאן.</p>
  </div>`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
}

export async function sendClientMail(card: MailCard) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false as const, error: "מפתח המייל לא מוגדר בשרת. צריך להוסיף RESEND_API_KEY ולפרוס מחדש." };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "NYmedia <noreply@nytv.app>",
      to: [card.email],
      subject: "פרטי כניסה למסכים של NYmedia",
      text: mailText(card),
      html: mailHtml(card),
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const reason = typeof body?.message === "string" ? body.message : `שגיאה ${response.status}`;
    return { ok: false as const, error: `המייל לא נשלח. ${reason}` };
  }
  return { ok: true as const };
}
