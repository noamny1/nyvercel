import { redirect } from "next/navigation";
import { toDataURL } from "qrcode";
import { AdminNav } from "@/components/admin/AdminNav";
import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { open, otpauth } from "@/lib/totp";
import { confirmTotp, startTotp } from "./actions";

export const dynamic = "force-dynamic";

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ error?: string; ready?: string }> }) {
  const session = await requireSession();
  if (!session) redirect("/admin/login");
  if (!isSystemAdmin(session)) redirect("/admin");
  const email = session.user?.email?.trim().toLowerCase() || "";
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user) redirect("/admin");
  const { error, ready } = await searchParams;
  const pending = open(user.totpPending);
  const qr = pending ? await toDataURL(otpauth(email, pending), { margin: 1, width: 280 }) : "";

  return (
    <main className="admin">
      <AdminNav />
      <h1>מאמת חשבונות</h1>
      <p>סורקים את הקוד באפליקציית מאמת, למשל Google Authenticator, ומאשרים עם הקוד בן 6 הספרות. בלי זה אי אפשר לפתוח את המסוף.</p>
      {user.totpSecret ? <p>המאמת פעיל.</p> : <p>המאמת עדיין לא הוגדר.</p>}
      {ready ? <p>המאמת נשמר.</p> : null}
      {error ? <p>הקוד לא מתאים. נסו שוב.</p> : null}
      <form action={startTotp}>
        <button type="submit">{user.totpSecret ? "החלפת מאמת" : "יצירת קוד"}</button>
      </form>
      {qr ? (
        <form action={confirmTotp} style={{ marginTop: 16 }}>
          <img src={qr} alt="קוד למאמת" width={280} height={280} />
          <p>אם אי אפשר לסרוק, מזינים ידנית: {pending}</p>
          <input name="code" inputMode="numeric" autoComplete="one-time-code" placeholder="6 ספרות" style={{ padding: 8 }} />
          <button type="submit">אישור</button>
        </form>
      ) : null}
    </main>
  );
}
