"use client";

function addressLines(screens: string[]) {
  return screens.length ? screens : ["לא שויכו מסכים"];
}

export function cardSvg(card: { name: string; email: string; password: string; screens: string[] }) {
  const lines = addressLines(card.screens);
  const height = 860 + lines.length * 54;
  const screenText = lines
    .map((line, index) => `<text x="980" y="${720 + index * 54}" fill="#252525" font-size="32" font-family="Calibri, Arial, sans-serif" text-anchor="end">${escapeXml(line)}</text>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${height}" viewBox="0 0 1080 ${height}">
  <rect width="1080" height="${height}" fill="#5A1F2B"/>
  <rect x="48" y="48" width="984" height="${height - 96}" rx="28" fill="#F4F1ED"/>
  <text x="980" y="150" fill="#5A1F2B" font-size="28" letter-spacing="6" font-family="Calibri, Arial, sans-serif" text-anchor="end">NYMEDIA</text>
  <text x="980" y="230" fill="#252525" font-size="54" font-family="Calibri, Arial, sans-serif" text-anchor="end">פרטי כניסה למסכים</text>
  <text x="980" y="300" fill="#252525" font-size="36" font-family="Calibri, Arial, sans-serif" text-anchor="end">${escapeXml(card.name || "לקוח")}</text>
  <text x="980" y="400" fill="#5c5854" font-size="26" font-family="Calibri, Arial, sans-serif" text-anchor="end">כניסה</text>
  <text x="980" y="448" fill="#252525" font-size="34" font-family="Calibri, Arial, sans-serif" text-anchor="end">https://nytv.app/admin/login</text>
  <text x="980" y="520" fill="#5c5854" font-size="26" font-family="Calibri, Arial, sans-serif" text-anchor="end">אימייל</text>
  <text x="980" y="568" fill="#252525" font-size="34" font-family="Calibri, Arial, sans-serif" text-anchor="end">${escapeXml(card.email)}</text>
  <text x="620" y="520" fill="#5c5854" font-size="26" font-family="Calibri, Arial, sans-serif" text-anchor="end">סיסמה</text>
  <text x="620" y="568" fill="#252525" font-size="34" font-family="Calibri, Arial, sans-serif" text-anchor="end">${escapeXml(card.password)}</text>
  <text x="980" y="660" fill="#5A1F2B" font-size="28" font-family="Calibri, Arial, sans-serif" text-anchor="end">המסכים באחריותך</text>
  ${screenText}
  <text x="980" y="${height - 110}" fill="#5c5854" font-size="24" font-family="Calibri, Arial, sans-serif" text-anchor="end">אפשר לנהל רק את המסכים שמופיעים כאן</text>
</svg>`;
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
}

export function ClientCard(card: { name: string; email: string; password: string; screens: string[] }) {
  const svg = cardSvg(card);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  function download() {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 860 + addressLines(card.screens).length * 54;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(image, 0, 0);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `nytv-${card.email}.png`;
      link.click();
    };
    image.src = url;
  }

  return (
    <section className="card">
      <h2>כרטיס ללקוח</h2>
      <p>הסיסמה מוצגת פעם אחת. הורידו את התמונה ושלחו ללקוח.</p>
      <img className="client-card" src={url} alt="כרטיס פרטי כניסה" />
      <button type="button" onClick={download}>הורדת תמונה</button>
    </section>
  );
}
