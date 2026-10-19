const CITIES: [string, number, number][] = [
  ["תל אביב-יפו", 32.0853, 34.7818],
  ["תל אביב", 32.0853, 34.7818],
  ["ירושלים", 31.7683, 35.2137],
  ["חיפה", 32.794, 34.9896],
  ["באר שבע", 31.2518, 34.7913],
  ["אשדוד", 31.8014, 34.6435],
  ["אשקלון", 31.6688, 34.5743],
  ["נתניה", 32.3215, 34.8532],
  ["ראשון לציון", 31.973, 34.7925],
  ["פתח תקווה", 32.0841, 34.8878],
  ["חולון", 32.0114, 34.7748],
  ["בני ברק", 32.0807, 34.8338],
  ["רמת גן", 32.0684, 34.8248],
  ["רחובות", 31.8948, 34.8118],
  ["בת ים", 32.0231, 34.7503],
  ["הרצליה", 32.1624, 34.8447],
  ["כפר סבא", 32.175, 34.9069],
  ["רעננה", 32.1848, 34.8712],
  ["חדרה", 32.434, 34.9196],
  ["מודיעין", 31.898, 35.0104],
  ["לוד", 31.9514, 34.8881],
  ["רמלה", 31.9293, 34.8656],
  ["יבנה", 31.8778, 34.7439],
  ["גדרה", 31.812, 34.7781],
  ["קריית גת", 31.61, 34.7642],
  ["קריית מלאכי", 31.7285, 34.7464],
  ["נתיבות", 31.4231, 34.589],
  ["שדרות", 31.525, 34.5969],
  ["אופקים", 31.3141, 34.6203],
  ["דימונה", 31.0694, 35.0334],
  ["ערד", 31.2589, 35.2128],
  ["אילת", 29.5577, 34.9519],
  ["בית שמש", 31.7456, 34.9867],
  ["ביתר עילית", 31.698, 35.114],
  ["מודיעין עילית", 31.932, 35.042],
  ["אלעד", 32.052, 34.951],
  ["טבריה", 32.7959, 35.531],
  ["צפת", 32.9646, 35.496],
  ["עכו", 32.9281, 35.0764],
  ["נהריה", 33.0085, 35.0981],
  ["כרמיאל", 32.9171, 35.305],
  ["עפולה", 32.6076, 35.2891],
  ["קריית שמונה", 33.2079, 35.5702],
  ["נס ציונה", 31.9291, 34.7987],
  ["אור יהודה", 32.0297, 34.8564],
  ["יהוד", 32.0333, 34.891],
  ["גבעתיים", 32.0697, 34.811],
  ["ראש העין", 32.0956, 34.9566],
  ["הוד השרון", 32.15, 34.888],
  ["קריית אונו", 32.0636, 34.8553],
  ["קריית ים", 32.8497, 35.068],
  ["קריית ביאליק", 32.8275, 35.0858],
  ["קריית מוצקין", 32.838, 35.079],
  ["קריית אתא", 32.8094, 35.106],
  ["נצרת", 32.6996, 35.3035],
  ["עכו", 32.9281, 35.0764],
];

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

type Point = { latitude: number; longitude: number };

function knownCity(text: string): Point | null {
  const name = text.replace(/[״"'׳]/g, "").replace(/\s+/g, " ").trim();
  if (!name) return null;
  const hit = [...CITIES].sort((a, b) => b[0].length - a[0].length).find(([city]) => name === city || name.includes(city));
  return hit ? { latitude: hit[1], longitude: hit[2] } : null;
}

async function geocode(city: string): Promise<Point | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=he&countryCode=IL&format=json`;
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4000) });
  if (!response.ok) return null;
  const data = (await response.json()) as { results?: Point[] };
  return data.results?.[0] ?? null;
}

async function openMeteo(point: Point) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${point.latitude}&longitude=${point.longitude}` +
    "&current=temperature_2m,weather_code&timezone=Asia%2FJerusalem";
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4000) });
  if (!response.ok) return null;
  const data = (await response.json()) as { current?: { temperature_2m: number; weather_code: number } };
  if (!data.current) return null;
  return {
    temp: Math.round(data.current.temperature_2m),
    label: LABELS[data.current.weather_code] || "מזג אוויר",
  };
}

async function metNo(point: Point) {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${point.latitude}&lon=${point.longitude}`;
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
    headers: { "User-Agent": "nytv.app/1.0 weather@nytv.app" },
  });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    properties?: { timeseries?: { data?: { instant?: { details?: { air_temperature?: number } }; next_1_hours?: { summary?: { symbol_code?: string } } } }[] };
  };
  const now = data.properties?.timeseries?.[0]?.data;
  const temp = now?.instant?.details?.air_temperature;
  if (typeof temp !== "number") return null;
  const symbol = now?.next_1_hours?.summary?.symbol_code || "";
  const label = symbol.includes("thunder") ? "סופת רעמים"
    : symbol.includes("snow") ? "שלג"
    : symbol.includes("rain") || symbol.includes("sleet") ? "גשם"
    : symbol.includes("fog") ? "ערפל"
    : symbol.includes("cloud") ? "מעונן חלקית"
    : "בהיר";
  return { temp: Math.round(temp), label };
}

export async function weatherFor(city: string) {
  const name = city.trim();
  if (!name) return null;
  const point = knownCity(name) || await geocode(name).catch(() => null);
  if (!point) return null;
  return await openMeteo(point).catch(() => null) || await metNo(point).catch(() => null);
}
