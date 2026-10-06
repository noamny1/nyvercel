import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import "./view.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "צפייה",
  robots: { index: false, follow: false },
};

export default async function ViewFile({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(token)) notFound();
  const link = await prisma.fileLink.findUnique({ where: { token } }).catch(() => null);
  if (!link) notFound();
  const image = link.mime.startsWith("image/");
  const pdf = link.mime === "application/pdf";
  let text = "";
  if (link.mime.startsWith("text/")) {
    const upstream = await fetch(link.url, { cache: "no-store" }).catch(() => null);
    text = upstream?.ok ? await upstream.text() : "";
  }
  return (
    <main className="file-view">
      <header>
        <img src="/nymedia-logo.png" alt="" />
        <div>
          <strong>{link.name || "מסמך"}</strong>
          <span>צפייה בלבד. אין הורדה מהאתר.</span>
        </div>
      </header>
      <section className={text ? "is-text" : ""}>
        {image ? <img src={`/v/${token}/file`} alt="" draggable={false} /> : null}
        {pdf ? <iframe src={`/v/${token}/file#toolbar=0&navpanes=0`} title={link.name || "מסמך"} /> : null}
        {text ? <pre>{text}</pre> : null}
        {image ? <div className="file-shield" /> : null}
      </section>
    </main>
  );
}
