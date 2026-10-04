type MailCard = { name: string; email: string; password: string; screens: string[] };

export function mailText(card: MailCard) {
  return [
    `שלום ${card.name || ""}`,
    "",
    "אלה פרטי הכניסה למסכים שבאחריותך:",
    "כניסה: https://nytv.app/admin/login",
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

export function mailtoLink(card: MailCard) {
  return `mailto:${card.email}?subject=${encodeURIComponent("פרטי כניסה למסכים של NYmedia")}&body=${encodeURIComponent(mailText(card))}`;
}

export async function sendClientMail(card: MailCard) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false as const, error: "missing-key" };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "NYmedia <onboarding@resend.dev>",
      to: [card.email],
      subject: "פרטי כניסה למסכים של NYmedia",
      text: mailText(card),
    }),
  });
  if (!response.ok) return { ok: false as const, error: "failed" };
  return { ok: true as const };
}
