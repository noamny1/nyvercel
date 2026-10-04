import { notFound } from "next/navigation";
import { Player } from "@/components/player/Player";
import { Music } from "@/components/player/Music";
import { Ping } from "@/components/player/Ping";
import { Clock } from "@/components/widgets/Clock";
import { Directory } from "@/components/widgets/Directory";
import { Markets } from "@/components/widgets/Markets";
import { NewsTicker } from "@/components/widgets/NewsTicker";
import { Notices } from "@/components/widgets/Notices";
import { Shabbat } from "@/components/widgets/Shabbat";
import { Weather } from "@/components/widgets/Weather";
import { markets } from "@/lib/markets";
import { newsFor } from "@/lib/news";
import { prisma } from "@/lib/prisma";
import { slideIsOn } from "@/lib/schedule";
import { shabbatFor } from "@/lib/shabbat";
import { weatherFor } from "@/lib/weather";
import "@/components/player/player.css";
import "@/components/themes/modern.css";
import "@/components/themes/yuval.css";
import "@/components/themes/residential.css";
import "@/components/themes/extra.css";

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
      updates: { where: { active: true }, orderBy: { id: "desc" } },
      group: {
        include: {
          slides: { orderBy: { sort: "asc" } },
          notices: { where: { active: true }, orderBy: { id: "desc" }, take: 4 },
          tickers: { where: { active: true }, orderBy: { id: "desc" } },
          floors: { include: { rooms: true }, orderBy: { id: "asc" } },
        },
      },
    },
  });
  if (!screen || Number.isNaN(Number(id))) notFound();
  const source = screen.group ?? screen;
  const street = screen.street || source.street;
  const number = screen.number || source.number;
  const city = screen.city || source.city;
  const slides = source.slides.filter((slide) => slideIsOn(slide));
  const visible = slides.length > 0 ? slides : source.slides;

  const [weather, shabbat, headlines, rates] = await Promise.all([
    weatherFor(city).catch(() => null),
    shabbatFor(city).catch(() => null),
    newsFor(source.newsSource).catch(() => []),
    markets().catch(() => []),
  ]);
  const ticker = screen.updates.map((item) => item.text);

  const indexTheme = source.theme.startsWith("index");
  const floors = screen.group?.floors ?? [];

  return (
    <main className={`stage theme-${source.theme}${source.theme === "yuval" ? " layout-yuval" : ""}${indexTheme ? " layout-index" : ""}`}>
      <Music url={screen.group?.musicUrl || ""} />
      <Ping id={screen.id} />
      <section className="slide">
        {indexTheme ? (
          <div className="index-board">
            <div className="index-title">מדריך משרדים</div>
            <Directory floors={floors} />
          </div>
        ) : (
          <Player slides={visible.map((slide) => ({ imageUrl: slide.imageUrl, duration: slide.duration }))} />
        )}
      </section>
      <aside className="rail">
        <div className="address">{address(street, number, city)}</div>
        {source.logoUrl ? <img className="logo" src={source.logoUrl} alt="" /> : null}
        <Clock />
        <Weather temp={weather?.temp ?? null} label={weather?.label || ""} />
        <Shabbat candles={shabbat?.candles || ""} parsha={shabbat?.parsha || ""} />
        <Notices items={source.notices.map((notice) => notice.text)} />
        <Directory floors={indexTheme ? [] : floors} />
        <Markets rows={rates} />
      </aside>
      <NewsTicker titles={[...ticker, ...headlines.map((item) => item.title)]} />
    </main>
  );
}
