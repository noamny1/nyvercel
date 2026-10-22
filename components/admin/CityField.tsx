import { CITIES, officialCity } from "@/lib/cities";

export function CityField({
  name = "city",
  defaultValue = "",
  required = false,
  disabled = false,
}: {
  name?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const current = officialCity(defaultValue);
  const extra = current && !CITIES.includes(current) ? current : "";
  return (
    <select name={name} defaultValue={current} required={required} disabled={disabled}>
      <option value="">{required ? "בחרו עיר" : "בלי עיר"}</option>
      {extra ? <option value={extra}>{extra}</option> : null}
      {CITIES.map((city) => (
        <option key={city} value={city}>{city}</option>
      ))}
    </select>
  );
}
