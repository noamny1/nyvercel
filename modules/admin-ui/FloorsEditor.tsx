"use client";

import { useState } from "react";
import { addFloor, addRoom, deleteFloor, deleteRoom, saveFloor, setRoomLogo } from "@/app/admin/actions";

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
      <p>אין שקפים ואין הודעות במסך הזה. עורכים את הקומה ואת החדרים, ולחיצה אחת על שמירת הקומה שומרת את הכל.</p>
      {floors.map((floor) => {
        const here = `${returnTo}#floor-${floor.id}`;
        return (
        <div className="floor-block" id={`floor-${floor.id}`} key={floor.id}>
          <form
            className="floor-save"
            action={async (data) => {
              const y = window.scrollY;
              const until = Date.now() + 1500;
              const hold = () => {
                if (Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y);
                if (Date.now() < until) requestAnimationFrame(hold);
              };
              hold();
              await saveFloor(data);
            }}
          >
            <input type="hidden" name="id" value={floor.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <header className="floor-head">
              <div className="floor-rename">
                <label>שם או מספר הקומה<input name="name" required defaultValue={floor.name} maxLength={40} /></label>
              </div>
              <button className="light" type="submit" form={`del-floor-${floor.id}`}>מחיקת קומה</button>
            </header>
            {floor.rooms.map((room) => (
              <div className="room-line" key={room.id}>
                <div className="room-fields">
                  <label>שם המשרד<input name={`room-${room.id}-name`} required defaultValue={room.name} maxLength={80} /></label>
                  <label>מספר חדר<input name={`room-${room.id}-detail`} defaultValue={room.detail} maxLength={80} placeholder="406" /></label>
                </div>
                <div className="room-tools">
                  {room.logoUrl ? <img src={room.logoUrl} alt="" /> : <span className="room-logo-empty">בלי לוגו</span>}
                  <RoomLogo roomId={room.id} logoUrl={room.logoUrl} returnTo={here} />
                  <button className="light" type="submit" form={`del-room-${room.id}`}>מחיקה</button>
                </div>
              </div>
            ))}
            <div className="floor-save-row">
              <button type="submit">שמירת הקומה</button>
            </div>
          </form>
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
          <AddRoom floorId={floor.id} returnTo={here} />
        </div>
        );
      })}
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
