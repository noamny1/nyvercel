export function Weather({ temp, label }: { temp: number | null; label: string }) {
  return (
    <div className="widget">
      <h3>מזג אוויר</h3>
      <div>{temp === null ? "—" : `${temp}° ${label}`}</div>
    </div>
  );
}
