import { notFound } from "next/navigation";
import { Player } from "@/components/player/Player";
import { Clock } from "@/components/widgets/Clock";
import { Markets } from "@/components/widgets/Markets";
import { NewsTicker } from "@/components/widgets/NewsTicker";
import { Notices } from "@/components/widgets/Notices";
import { Shabbat } from "@/components/widgets/Shabbat";
import { Weather } from "@/components/widgets/Weather";
import { markets } from "@/lib/markets";
import { newsFor } from "@/lib/news";
import { prisma } from "@/lib/prisma";
import { shabbatFor } from "@/lib/shabbat";
import { weatherFor } from "@/lib/weather";
import "@/components/player/player.css";
import "@/components/themes/modern.css";
import "@/components/themes/yuval.css";
import "@/components/themes/residential.css";

export const dynamic = "force-dynamic";

function address(street: string, number: string, city: string) {
  const line = [street, number].filter(Boolean).join(" ");
  return [line, city].filter(Boolean).join(", ");
}

export default async function ScreenView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const screen = await prisma.screen.findUnique({
    where: { id: Number(id) },
    include: {
      slides: { orderBy: { sort: "asc" } },
      notices: { where: { active: true }, orderBy: { id: "desc" }, take: 4 },
    },
  });
  if (!screen || Number.isNaN(Number(id))) notFound();

  const [weather, shabbat, headlines, rates] = await Promise.all([
    weatherFor(screen.city).catch(() => null),
    shabbatFor(screen.city).catch(() => null),
    newsFor(screen.newsSource).catch(() => []),
    markets().catch(() => []),
  ]);

  return (
    <main className={`stage theme-${screen.theme}`}>
      <section className="slide">
        <Player slides={screen.slides.map((slide) => ({ imageUrl: slide.imageUrl, duration: slide.duration }))} />
      </section>
      <aside className="rail">
        <div className="address">{address(screen.street, screen.number, screen.city)}</div>
        {screen.logoUrl ? <img className="logo" src={screen.logoUrl} alt="" /> : null}
        <Clock />
        <Weather temp={weather?.temp ?? null} label={weather?.label || ""} />
        <Shabbat candles={shabbat?.candles || ""} parsha={shabbat?.parsha || ""} />
        <Notices items={screen.notices.map((notice) => notice.text)} />
        <Markets rows={rates} />
      </aside>
      <NewsTicker titles={headlines.map((item) => item.title)} />
    </main>
  );
}
