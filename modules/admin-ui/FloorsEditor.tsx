"use client";

import { useRef, useState, useEffect } from "react";
import { addFloor, addRoom, deleteFloor, deleteRoom, autoSaveRoom, autoSaveFloor, setRoomLogo, setBuildingLogo } from "@/app/admin/actions";

type Room = { id: number; name: string; detail: string; logoUrl: string };
type Floor = { id: number; name: string; rooms: Room[] };

export function FloorsEditor({
  floors,
  screenId = 0,
  groupId = 0,
  returnTo,
  buildingLogo = "",
}: {
  floors: Floor[];
  screenId?: number;
  groupId?: number;
  returnTo: string;
  buildingLogo?: string;
}) {
  const [logoNote, setLogoNote] = useState("");
  const [saveNote, setSaveNote] = useState("");
  const [open, setOpen] = useState<Record<number, boolean>>({});
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("logo");
    if (status === "ok") setLogoNote("לוגו הבניין הועלה בהצלחה");
    else if (status === "fail") setLogoNote("העלאת לוגו הבניין נכשלה");
  }, []);
  return (
    <section className="card floors-admin">
      <h2>קומות וחדרים</h2>
      <p>אין שקפים ואין הודעות במסך הזה. עורכים את הקומה ואת החדרים, ולחיצה אחת על שמירת שינויים שומרת את הכל.</p>
      <form className="floor-add" action={setBuildingLogo} style={{marginBottom: 16, padding: 12, border: "2px solid #5a1f2b", borderRadius: 8, background: "#faf8f6"}}>
        {screenId ? <input type="hidden" name="screenId" value={screenId} /> : null}
        {groupId ? <input type="hidden" name="groupId" value={groupId} /> : null}
        <input type="hidden" name="returnTo" value={returnTo} />
        <div style={{display: "flex", alignItems: "center", gap: 12, marginBottom: 8}}>
          {buildingLogo ? <img src={buildingLogo} alt="" style={{width: 80, height: 90, objectFit: "contain", background: "#fff", border: "1px solid #e6e0da", borderRadius: 6}} /> : <div style={{width: 80, height: 90, background: "#eee", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 12}}>אין לוגו</div>}
          <div>
            <label style={{fontWeight: 500, display: "block", marginBottom: 4}}>לוגו הבניין</label>
            <input name="file" type="file" accept="image/*" />
          </div>
        </div>
        <button type="submit" style={{background: "#5a1f2b", color: "#fff", padding: "8px 16px", borderRadius: 6, border: "none"}}>העלאת לוגו בניין</button>
        {logoNote ? <p style={{margin: "10px 0 0", padding: "8px 12px", borderRadius: 6, background: logoNote.includes("נכשלה") ? "#fde8ea" : "#e8f5e9", color: logoNote.includes("נכשלה") ? "#8a1f2b" : "#1f7a3a", fontWeight: 500}}>{logoNote}</p> : null}
      </form>
      {floors.map((floor) => (
        <FloorCard key={floor.id} floor={floor} returnTo={returnTo} open={!!open[floor.id]} onToggle={() => setOpen((prev) => ({ ...prev, [floor.id]: !prev[floor.id] }))} />
      ))}
      <form className="floor-add" action={addFloor}>
        {screenId ? <input type="hidden" name="screenId" value={screenId} /> : null}
        {groupId ? <input type="hidden" name="groupId" value={groupId} /> : null}
        <input type="hidden" name="returnTo" value={returnTo} />
        <label>קומה<input name="name" required placeholder="לדוגמה 3" maxLength={40} /></label>
        <button type="submit">הוספת קומה</button>
      </form>
    </section>
  );
}

function FloorCard({ floor, returnTo, open, onToggle }: { floor: Floor; returnTo: string; open: boolean; onToggle: () => void }) {
  const here = `${returnTo}#floor-${floor.id}`;
  return (
    <div className="floor-block" id={`floor-${floor.id}`} style={{border: "1px solid #e6e0da", borderRadius: 8, marginBottom: 12}}>
        <header className="floor-head" style={{cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: open ? "#faf8f6" : "#fff"}} onClick={onToggle}>
          <div className="floor-rename" style={{display: "flex", alignItems: "center", gap: 8}}>
            <span style={{fontSize: 18}}>{open ? "▼" : "◀"}</span>
            <strong>{floor.name || "קומה"}</strong>
            <small style={{color: "#888"}}>({floor.rooms.length} חדרים)</small>
          </div>
          <button className="light" type="button" onClick={(e) => { e.stopPropagation(); }} form={`del-floor-${floor.id}`}>מחיקת קומה</button>
        </header>
        {open ? (
        <>
        <div style={{padding: "8px 12px"}}>
          <label>שם או מספר הקומה<input defaultValue={floor.name} maxLength={40} onBlur={async (e) => {
      const data = new FormData();
      data.set("id", String(floor.id));
      data.set("name", e.target.value);
      await autoSaveFloor(data);
    }} /></label>
        </div>
        {floor.rooms.map((room) => (
          <div className="room-line" key={room.id}>
            <div className="room-fields">
              <label>שם המשרד<input defaultValue={room.name} maxLength={80} onBlur={async (e) => {
                const data = new FormData();
                data.set("id", String(room.id));
                data.set("name", e.target.value);
                data.set("detail", (e.target.closest(".room-fields")?.querySelector("input[placeholder]") as HTMLInputElement)?.value || room.detail);
                await autoSaveRoom(data);
              }} /></label>
              <label>מספר חדר<input defaultValue={room.detail} maxLength={80} placeholder="406" onBlur={async (e) => {
                const data = new FormData();
                data.set("id", String(room.id));
                data.set("name", (e.target.closest(".room-fields")?.querySelector("input:not([placeholder])") as HTMLInputElement)?.value || room.name);
                data.set("detail", e.target.value);
                await autoSaveRoom(data);
              }} /></label>
            </div>
            <div className="room-tools">
              {room.logoUrl ? <img src={room.logoUrl} alt="" /> : <span className="room-logo-empty">בלי לוגו</span>}
              <RoomLogo roomId={room.id} logoUrl={room.logoUrl} returnTo={here} />
              <button className="light" type="submit" form={`del-room-${room.id}`}>מחיקה</button>
            </div>
          </div>
        ))}
        <AddRoom floorId={floor.id} returnTo={here} />
        </>
        ) : null}
      <form id={`del-floor-${floor.id}`} action={deleteFloor} hidden>
        <input type="hidden" name="id" value={floor.id} />
        <input type="hidden" name="returnTo" value={returnTo} />
      </form>
      {floor.rooms.map((room) => (
        <form id={`del-room-${room.id}`} action={deleteRoom} hidden key={`del-${room.id}`}>
          <input type="hidden" name="id" value={room.id} />
          <input type="hidden" name="returnTo" value={here} />
        </form>
      ))}
      {floor.rooms.filter((room) => room.logoUrl).map((room) => (
        <form id={`clear-room-${room.id}`} action={setRoomLogo} hidden key={`clear-${room.id}`}>
          <input type="hidden" name="id" value={room.id} />
          <input type="hidden" name="clearLogo" value="1" />
          <input type="hidden" name="returnTo" value={here} />
        </form>
      ))}
    </div>
  );
}

function AddRoom({ floorId, returnTo }: { floorId: number; returnTo: string }) {
  const [logoUrl, setLogoUrl] = useState("");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");

  async function submit() {
    if (!name.trim()) { setNote("bad"); return; }
    setBusy("מוסיף...");
    const data = new FormData();
    data.set("floorId", String(floorId));
    data.set("returnTo", returnTo);
    data.set("name", name.trim());
    data.set("detail", detail.trim());
    data.set("logoUrl", logoUrl);
    try {
      await addRoom(data);
      setNote("ok");
      setName("");
      setDetail("");
      setLogoUrl("");
      window.location.reload();
    } catch {
      setNote("bad");
    }
    setBusy("");
  }

  return (
    <div
      className="room-add"
      style={{border: "2px solid #5a1f2b", borderRadius: 8, padding: 12, marginTop: 12, background: "#faf8f6"}}
    >
      <label>שם<input value={name} onChange={(e) => setName(e.target.value)} placeholder="דייר או עסק" maxLength={80} /></label>
      <label>חדר<input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="מספר או פירוט" maxLength={80} /></label>
      <label className="file-pill">
        <input
          type="file"
          accept="image/*,.gif"
          disabled={Boolean(busy)}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void pickLogo(file, setLogoUrl, setBusy);
          }}
        />
        {busy || (logoUrl ? "לוגו נוסף" : "לוגו לא חובה")}
      </label>
      <button type="button" onClick={submit} disabled={Boolean(busy)} style={{background: "#5a1f2b", color: "#fff"}}>הוספת חדר</button>
      {note === "ok" ? <span style={{color: "#1f7a3a", marginRight: 8}}>החדר נוסף</span> : null}
      {note === "bad" ? <span style={{color: "#8a1f2b", marginRight: 8}}>הוספת החדר נכשלה</span> : null}
    </div>
  );
}

function stay() {
  const y = window.scrollY;
  const until = Date.now() + 1500;
  const hold = () => {
    if (Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y);
    if (Date.now() < until) requestAnimationFrame(hold);
  };
  hold();
}

function RoomLogo({ roomId, logoUrl, returnTo }: { roomId: number; logoUrl: string; returnTo: string }) {
  const [busy, setBusy] = useState("");

  return (
    <>
      <label className="file-pill">
        <input
          type="file"
          accept="image/*,.gif"
          disabled={Boolean(busy)}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setBusy("מעלה...");
            const url = await uploadLogo(file);
            if (!url) {
              setBusy("");
              return;
            }
            const data = new FormData();
            data.set("id", String(roomId));
            data.set("logoUrl", url);
            data.set("returnTo", returnTo);
            await setRoomLogo(data);
          }}
        />
        {busy || (logoUrl ? "החלפת לוגו" : "הוספת לוגו")}
      </label>
      {logoUrl ? (
        <button className="light" type="submit" form={`clear-room-${roomId}`}>הסרת לוגו</button>
      ) : null}
    </>
  );
}

async function pickLogo(file: File, setLogoUrl: (url: string) => void, setBusy: (text: string) => void) {
  setBusy("מעלה...");
  const url = await uploadLogo(file);
  setLogoUrl(url);
  setBusy("");
}

async function uploadLogo(file: File) {
  const body = new FormData();
  body.set("file", file);
  body.set("kind", "image");
  const response = await fetch("/api/upload", { method: "POST", body });
  const payload = await response.json().catch(() => ({}));
  return typeof payload.url === "string" ? payload.url : "";
}
