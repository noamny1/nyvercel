"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NEWS_SOURCES } from "@/lib/news-sources";
import { THEMES } from "@/lib/themes";
import { addGroupNotice, addNotice, deleteGroupNotice, deleteNotice, toggleGroupNotice, toggleNotice, updateGroup, updateScreen } from "@/app/admin/actions";

type Slide = { id: number; imageUrl: string; duration: number; sort: number; weekdays?: string; active?: boolean };
type Notice = { id: number; text: string; active: boolean };

export function ScreenEditor({
  screen,
  slides,
  notices,
  scope = "screen",
  buildings = [],
  feeds,
  lockAddress = false,
}: {
  screen: {
    id: number;
    name: string;
    street: string;
    number: string;
    city: string;
    theme: string;
    logoUrl: string;
    newsSource: string;
    musicUrl?: string;
    buildingId?: number | null;
  };
  slides: Slide[];
  notices: Notice[];
  scope?: "screen" | "group";
  buildings?: { id: number; name: string }[];
  feeds?: { id: string; name: string }[];
  lockAddress?: boolean;
}) {
  const router = useRouter();
  const save = scope === "group" ? updateGroup : updateScreen;
  const createNotice = scope === "group" ? addGroupNotice : addNotice;
  const flipNotice = scope === "group" ? toggleGroupNotice : toggleNotice;
  const dropNotice = scope === "group" ? deleteGroupNotice : deleteNotice;
  const ownerField = scope === "group" ? "groupId" : "screenId";
  const [logoUrl, setLogoUrl] = useState(screen.logoUrl);
  const [message, setMessage] = useState("");

  async function upload(file: File) {
    const body = new FormData();
    body.set("file", file);
    const response = await fetch("/api/upload", { method: "POST", body });
    const data = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !data.url) throw new Error(data.error || "ההעלאה נכשלה");
    return data.url;
  }

  async function onLogo(file: File) {
    setMessage("");
    try {
      setLogoUrl(await upload(file));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ההעלאה נכשלה");
    }
  }

  async function onSlide(file: File, duration: number) {
    setMessage("");
    try {
      const imageUrl = await upload(file);
      const response = await fetch("/api/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [ownerField]: screen.id, imageUrl, duration }),
      });
      if (!response.ok) throw new Error("שמירת השקף נכשלה");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ההעלאה נכשלה");
    }
  }

  async function changeSlide(id: number, payload: { duration?: number; direction?: "up" | "down"; weekdays?: string }) {
    await fetch("/api/slides", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });
    router.refresh();
  }

  async function removeSlide(id: number) {
    await fetch("/api/slides", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <div>
      <form className="card" action={save}>
        <input type="hidden" name="id" value={screen.id} />
        <input type="hidden" name="logoUrl" value={logoUrl} />
        <div className="row">
          <label>רחוב<input name="street" defaultValue={screen.street} readOnly={lockAddress} /></label>
          <label>מספר<input name="number" defaultValue={screen.number} readOnly={lockAddress} /></label>
          <label>עיר<input name="city" defaultValue={screen.city} readOnly={lockAddress} /></label>
          <label>תמה
            <select name="theme" defaultValue={screen.theme}>
              {THEMES.map((theme) => (
                <option key={theme.id} value={theme.id}>{theme.name}</option>
              ))}
            </select>
          </label>
          <label>חדשות
            <select name="newsSource" defaultValue={screen.newsSource}>
              {(feeds && feeds.length > 0 ? feeds : NEWS_SOURCES).map((source) => (
                <option key={source.id} value={source.id}>{source.name}</option>
              ))}
            </select>
          </label>
          {scope === "group" ? (
            <>
              <label>מוזיקה<input name="musicUrl" defaultValue={screen.musicUrl || ""} placeholder="קישור לקובץ שמע" /></label>
              <label>בניין
                <select name="buildingId" defaultValue={screen.buildingId ?? ""}>
                  <option value="">ללא</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>{building.name}</option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <label>לוגו הבניין
            <input type="file" accept="image/*" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onLogo(file);
            }} />
          </label>
          {logoUrl ? <img src={logoUrl} alt="" style={{ height: 48 }} /> : null}
          <button type="submit">שמירה</button>
        </div>
      </form>

      <section className="card">
        <h2>שקפים</h2>
        <label>תמונה חדשה
          <input type="file" accept="image/*" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onSlide(file, 8);
            event.currentTarget.value = "";
          }} />
        </label>
        {slides.map((slide) => (
          <div className="row" key={slide.id} style={{ marginTop: 10 }}>
            <img src={slide.imageUrl} alt="" style={{ width: 96, height: 54, objectFit: "cover" }} />
            <label>שניות
              <input type="number" min={3} defaultValue={slide.duration} onBlur={(event) => {
                void changeSlide(slide.id, { duration: Number(event.target.value) });
              }} />
            </label>
            <label>ימים
              <input defaultValue={slide.weekdays || "0123456"} title="0 ראשון עד 6 שבת" onBlur={(event) => {
                void changeSlide(slide.id, { weekdays: event.target.value });
              }} />
            </label>
            <button className="light" type="button" onClick={() => changeSlide(slide.id, { direction: "up" })}>למעלה</button>
            <button className="light" type="button" onClick={() => changeSlide(slide.id, { direction: "down" })}>למטה</button>
            <button className="light" type="button" onClick={() => removeSlide(slide.id)}>מחיקה</button>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>הודעות בניין</h2>
        <form className="row" action={createNotice}>
          <input type="hidden" name={ownerField} value={screen.id} />
          <input name="text" placeholder="הודעה" required />
          <button type="submit">הוספה</button>
        </form>
        {notices.map((notice) => (
          <div className="row" key={notice.id} style={{ marginTop: 8 }}>
            <span>{notice.text}</span>
            <form action={flipNotice}>
              <input type="hidden" name="id" value={notice.id} />
              <input type="hidden" name={ownerField} value={screen.id} />
              <button className="light" type="submit">{notice.active ? "פעיל" : "כבוי"}</button>
            </form>
            <form action={dropNotice}>
              <input type="hidden" name="id" value={notice.id} />
              <input type="hidden" name={ownerField} value={screen.id} />
              <button className="light" type="submit">מחיקה</button>
            </form>
          </div>
        ))}
      </section>
      {message ? <p className="error">{message}</p> : null}
    </div>
  );
}
