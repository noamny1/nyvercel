import "./flag.css";

export function FlagLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`il-flag${className ? ` ${className}` : ""}`} role="img" aria-label="דגל ישראל">
      <span className="il-cloth">
        <i />
        <svg viewBox="0 0 100 86" aria-hidden="true">
          <polygon points="50,6 90,74 10,74" />
          <polygon points="50,80 10,12 90,12" />
        </svg>
        <i />
      </span>
    </span>
  );
}

export function ClientLogo({ url, className = "" }: { url?: string; className?: string }) {
  if (url) return <img className={className} src={url} alt="" />;
  return <FlagLogo className={className} />;
}
