function variants(city: string) {
  const name = city.trim().replace(/[-–]/g, " ").replace(/\s+/g, " ");
  const list: string[] = [];
  const add = (value: string) => {
    const clean = value.replace(/\s+/g, " ").trim();
    if (clean && !list.includes(clean)) list.push(clean);
  };
  add(name);
  add(name.replaceAll("קרית", "קריית"));
  add(name.replaceAll("קריית", "קרית"));
  add(name.replaceAll("תקוה", "תקווה"));
  if (/\d/.test(name)) {
    const tail = name.split(" ").slice(-2).join(" ");
    add(tail);
    add(tail.replaceAll("קרית", "קריית"));
    add(tail.replaceAll("קריית", "קרית"));
  }
  return list;
}

async function search(name: string) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=he&format=json`;
  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    results?: { latitude: number; longitude: number }[];
  };
  return data.results?.[0] ?? null;
}

export async function locate(city: string) {
  for (const name of variants(city)) {
    const place = await search(name);
    if (place) return place;
  }
  return null;
}
