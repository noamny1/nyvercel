import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FilePane } from "./FilePane";
import "./view.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "מסמך לדיירים",
  robots: { index: false, follow: false },
};

export default async function ViewFile({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(token)) notFound();
  const link = await prisma.fileLink.findUnique({ where: { token } }).catch(() => null);
  if (!link) notFound();
  const kind = link.mime.startsWith("image/") ? "image" : link.mime === "application/pdf" ? "pdf" : "text";
  let text = "";
  if (kind === "text") {
    const upstream = await fetch(link.url, { cache: "no-store" }).catch(() => null);
    text = upstream?.ok ? await upstream.text() : "";
  }
  return <FilePane token={token} name={link.name || ""} kind={kind} text={text} />;
}
