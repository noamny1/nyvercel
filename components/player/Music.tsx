export function Music({ url }: { url: string }) {
  if (!url) return null;
  return <audio src={url} autoPlay loop />;
}
