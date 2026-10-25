import QRCode from "qrcode";

export function faultPayload(phone: string, link: string) {
  const target = link.trim();
  if (target) {
    if (/^https?:\/\//i.test(target) || /^tel:/i.test(target)) return target;
    const digits = target.replace(/[^\d+]/g, "");
    if (digits.length >= 7) return `tel:${digits}`;
    return target;
  }
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.length >= 7) return `tel:${digits}`;
  return "";
}

export async function faultQrSrc(payload: string, size: number) {
  return QRCode.toDataURL(payload, {
    margin: 1,
    width: size,
    errorCorrectionLevel: "M",
    color: { dark: "#5A1F2B", light: "#F4F1ED" },
  });
}

export function FaultCopy({ qr, phone }: { qr: string; phone: string }) {
  return (
    <div className="fault-copy">
      {qr ? <img src={qr} alt="" /> : null}
      <div>
        <b>פתיחת תקלה</b>
        <small>סריקה מהנייד</small>
        {phone ? <strong>{phone}</strong> : null}
      </div>
    </div>
  );
}

export function WelcomeLine({ line, city }: { line: string; city: string }) {
  return (
    <div className="fault-greet">
      <small>ברוכים הבאים</small>
      {line || city ? (
        <strong>
          {line ? <span>{line}</span> : null}
          {line && city ? <i /> : null}
          {city ? <span>{city}</span> : null}
        </strong>
      ) : null}
    </div>
  );
}
