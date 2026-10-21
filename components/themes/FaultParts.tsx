import QRCode from "qrcode";

export const FAULT_PHONE = "08-6744430";
const FAULT_TEL = "tel:086744430";

export async function faultQrSrc(size: number) {
  return QRCode.toDataURL(FAULT_TEL, {
    margin: 1,
    width: size,
    errorCorrectionLevel: "M",
    color: { dark: "#5A1F2B", light: "#F4F1ED" },
  });
}

export function FaultCopy({ qr, phone = true }: { qr: string; phone?: boolean }) {
  return (
    <div className="fault-copy">
      <img src={qr} alt="" />
      <div>
        <b>פתיחת תקלה</b>
        <small>סריקה מהנייד</small>
        {phone ? <strong>{FAULT_PHONE}</strong> : null}
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
