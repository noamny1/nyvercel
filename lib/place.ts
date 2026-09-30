export async function locate(city: string) {
  const name = city.trim();
  if (!name) return null;
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=he&format=json`;
  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    results?: { latitude: number; longitude: number }[];
  };
  return data.results?.[0] ?? null;
}
