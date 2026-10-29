"use client";

import { useState } from "react";
import { addFloor, addRoom, deleteFloor, deleteRoom, setRoomLogo, updateFloor, updateRoom } from "@/app/admin/actions";

type Room = { id: number; name: string; detail: string; logoUrl: string };
type Floor = { id: number; name: string; rooms: Room[] };

export function FloorsEditor({
  floors,
  screenId = 0,
  groupId = 0,
  returnTo,
}: {
  floors: Floor[];
  screenId?: number;
  groupId?: number;
  returnTo: string;
}) {
  return (
    <section className="card floors-admin">
      <h2>קומות וחדרים</h2>
      <p>אין שקפים ואין הודעות במסך הזה. אפשר לערוך שם קומה, שם משרד ומספר חדר, ואז ללחוץ שמירה.</p>
      {floors.map((floor) => (
        <div className="floor-block" key={floor.id}>
          <header className="floor-head">
            <form className="floor-rename" action={updateFloor}>
              <input type="hidden" name="id" value={floor.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <label>שם או מספר הקומה<input name="name" required defaultValue={floor.name} maxLength={40} /></label>
              <button type="submit">שמירה</button>
            </form>
            <form action={deleteFloor}>
              <input type="hidden" name="id" value={floor.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <button className="light" type="submit">מחיקת קומה</button>
            </form>
          </header>
          {floor.rooms.map((room) => (
            <div className="room-line" key={room.id}>
              <form className="room-edit" action={updateRoom}>
                <input type="hidden" name="id" value={room.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <label>שם המשרד<input name="name" required defaultValue={room.name} maxLength={80} /></label>
                <label>מספר חדר<input name="detail" defaultValue={room.detail} maxLength={80} placeholder="406" /></label>
                <button type="submit">שמירה</button>
              </form>
              <div className="room-tools">
                {room.logoUrl ? <img src={room.logoUrl} alt="" /> : <span className="room-logo-empty">בלי לוגו</span>}
                <RoomLogo roomId={room.id} logoUrl={room.logoUrl} returnTo={returnTo} />
                <form action={deleteRoom}>
                  <input type="hidden" name="id" value={room.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button className="light" type="submit">מחיקה</button>
                </form>
              </div>
            </div>
          ))}
          <AddRoom floorId={floor.id} returnTo={returnTo} />
        </div>
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

function AddRoom({ floorId, returnTo }: { floorId: number; returnTo: string }) {
  const [logoUrl, setLogoUrl] = useState("");
  const [busy, setBusy] = useState("");

  return (
    <form className="room-add" action={addRoom}>
      <input type="hidden" name="floorId" value={floorId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="logoUrl" value={logoUrl} />
      <label>שם<input name="name" required placeholder="דייר או עסק" maxLength={80} /></label>
      <label>חדר<input name="detail" placeholder="מספר או פירוט" maxLength={80} /></label>
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
      <button type="submit" disabled={Boolean(busy)}>הוספת חדר</button>
    </form>
  );
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
        <form action={setRoomLogo}>
          <input type="hidden" name="id" value={roomId} />
          <input type="hidden" name="clearLogo" value="1" />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button className="light" type="submit">הסרת לוגו</button>
        </form>
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
