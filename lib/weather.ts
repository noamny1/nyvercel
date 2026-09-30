import { locate } from "@/lib/place";

const LABELS: Record<number, string> = {
  0: "בהיר",
  1: "בהיר חלקית",
  2: "מעונן חלקית",
  3: "מעונן",
  45: "ערפל",
  48: "ערפל",
  51: "טפטוף",
  61: "גשם",
  63: "גשם",
  65: "גשם חזק",
  71: "שלג",
  80: "ממטרים",
  95: "סופת רעמים",
};

export async function weatherFor(city: string) {
  const place = await locate(city);
  if (!place) return null;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
    "&current=temperature_2m,weather_code&timezone=Asia%2FJerusalem";
  const response = await fetch(url, { next: { revalidate: 600 } });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    current?: { temperature_2m: number; weather_code: number };
  };
  if (!data.current) return null;
  return {
    temp: Math.round(data.current.temperature_2m),
    label: LABELS[data.current.weather_code] || "מזג אוויר",
  };
}
