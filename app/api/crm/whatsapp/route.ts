import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireSession } from "@/lib/session";
import { NextResponse } from "next/server";

const KEYS = ["wa-instance", "wa-token", "wa-group"] as const;

async function denied() {
  const session = await requireSession();
  if (!session || !isSystemAdmin(session)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return null;
}

async function settings() {
  const rows = await prisma.systemFlag.findMany({ where: { id: { in: [...KEYS] } } });
  const map = Object.fromEntries(rows.map((row) => [row.id, row.value]));
  return {
    instance: map["wa-instance"] || "",
    token: map["wa-token"] || "",
    group: map["wa-group"] || "",
  };
}

export async function GET() {
  const block = await denied();
  if (block) return block;
  const current = await settings();
  return NextResponse.json({
    connected: Boolean(current.instance && current.token && current.group),
    group: current.group,
  });
}

export async function PUT(req: Request) {
  const block = await denied();
  if (block) return block;
  const body = await req.json().catch(() => ({}));
  const instance = String(body.instance || "").trim().slice(0, 40);
  const token = String(body.token || "").trim().slice(0, 120);
  const group = String(body.group || "").trim().slice(0, 80);
  if (group && !group.endsWith("@g.us")) {
    return NextResponse.json({ error: "group" }, { status: 400 });
  }
  const current = await settings();
  const next = {
    "wa-instance": instance || current.instance,
    "wa-token": token || current.token,
    "wa-group": group || current.group,
  };
  await Promise.all(
    KEYS.map((id) =>
      prisma.systemFlag.upsert({
        where: { id },
        update: { value: next[id] },
        create: { id, value: next[id] },
      }),
    ),
  );
  return NextResponse.json({ connected: Boolean(next["wa-instance"] && next["wa-token"] && next["wa-group"]), group: next["wa-group"] });
}

export async function POST(req: Request) {
  const block = await denied();
  if (block) return block;
  const body = await req.json().catch(() => ({}));
  const text = String(body.text || "").trim().slice(0, 1500);
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });
  const current = await settings();
  if (!current.instance || !current.token || !current.group) {
    return NextResponse.json({ sent: false, reason: "not-connected" });
  }
  const url = `https://api.greenapi.com/waInstance${encodeURIComponent(current.instance)}/sendMessage/${encodeURIComponent(current.token)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId: current.group, message: text }),
  });
  if (!response.ok) return NextResponse.json({ sent: false, reason: "failed" });
  return NextResponse.json({ sent: true });
}
