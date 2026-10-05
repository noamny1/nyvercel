import { notFound } from "next/navigation";
import { Player } from "@/components/player/Player";
import { Music } from "@/components/player/Music";
import { Wake } from "@/components/player/Wake";
import { Ping } from "@/components/player/Ping";
import { Clock } from "@/components/widgets/Clock";
import { Directory } from "@/components/widgets/Directory";
import { Markets } from "@/components/widgets/Markets";
import { NewsTicker } from "@/components/widgets/NewsTicker";
import { Notices } from "@/components/widgets/Notices";
import { Shabbat } from "@/components/widgets/Shabbat";
import { Weather } from "@/components/widgets/Weather";
import { ModernRail } from "@/components/themes/ModernRail";
import { markets } from "@/lib/markets";
import { liveHeadlines } from "@/lib/news";
import { prisma } from "@/lib/prisma";
import { FIXED_VIDEOS } from "@/lib/ready-slides";
import { slideIsOn } from "@/lib/schedule";
import { shabbatFor } from "@/lib/shabbat";
import { weatherFor } from "@/lib/weather";
import "@/components/player/player.css";
import "@/components/themes/modern.css";
import "@/components/themes/yuval.css";
import "@/components/themes/residential.css";
import "@/components/themes/extra.css";

export const revalidate = 300;

function address(street: string, number: string, city: string) {
  const line = [street, number].filter(Boolean).join(" ");
  return [line, city].filter(Boolean).join(", ");
}

export default async function ScreenView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const key = Number(id);
  if (!Number.isInteger(key) || key <= 0) notFound();
  const include = {
    slides: { orderBy: { sort: "asc" as const } },
    notices: { where: { active: true }, orderBy: { id: "desc" as const }, take: 4 },
    updates: { where: { active: true }, orderBy: { id: "desc" as const } },
    group: {
      include: {
        slides: { orderBy: { sort: "asc" as const } },
        notices: { where: { active: true }, orderBy: { id: "desc" as const }, take: 4 },
        tickers: { where: { active: true }, orderBy: { id: "desc" as const } },
        floors: { include: { rooms: true }, orderBy: { id: "asc" as const } },
      },
    },
  };
  const screen = await prisma.screen.findUnique({ where: { code: key }, include })
    ?? (key > 0 && key < 100000 ? await prisma.screen.findUnique({ where: { id: key }, include }) : null);
  if (!screen || Number.isNaN(Number(id))) notFound();
  const source = screen.group ?? screen;
  const street = screen.street || source.street;
  const number = screen.number || source.number;
  const city = screen.city || source.city;
  const pool = screen.slides.length > 0 ? screen.slides : source.slides;
  const visible = pool.filter((slide) => slideIsOn(slide));
  const notices = screen.notices.length > 0 ? screen.notices : source.notices;

  const [weather, shabbat, headlines, rates] = await Promise.all([
    weatherFor(city).catch(() => null),
    shabbatFor(city).catch(() => null),
    liveHeadlines(screen.newsSource || source.newsSource || "ynet", screen.newsCount || 8).catch(() => []),
    markets().catch(() => []),
  ]);
  const theme = screen.theme || source.theme || "modern";
  const newsSource = screen.newsSource || source.newsSource || "ynet";
  const newsName = newsSource === "channel14" ? "חדשות 14" : newsSource === "walla" ? "וואלה" : newsSource === "ynet" ? "ynet" : newsSource;
  const modern = theme === "modern";

  const indexTheme = theme.startsWith("index");
  const floors = screen.group?.floors ?? [];

  return (
    <main className={`stage theme-${theme}${theme === "yuval" ? " layout-yuval" : ""}${indexTheme ? " layout-index" : ""}`}>
      <Music playlist={screen.musicPlaylist || ""} url={screen.group?.musicUrl || ""} start={screen.id} />
      <Wake />
      <Ping code={screen.code || screen.id} revision={screen.revision} />
      <section className="slide">
        {indexTheme && visible.length === 0 ? (
          <div className="index-board">
            <div className="index-title">מדריך משרדים</div>
            <Directory floors={floors} />
          </div>
        ) : (
          <Player slides={visible.map((slide) => {
            const official = FIXED_VIDEOS.find((item) => item.id === slide.templateId);
            const parasha = slide.templateId === "weekly-parasha";
            let flow = "";
            try { flow = JSON.parse(slide.meta || "{}").flow || ""; } catch { flow = ""; }
            const slow = parasha ? Math.max(180, slide.duration || 0, flow === "static" ? 180 : Math.round((shabbat?.verses.length || 40) * 2.2)) : 0;
            return {
            imageUrl: official?.url || slide.imageUrl,
            duration: official?.duration || slow || slide.duration,
            kind: slide.kind,
            templateId: slide.templateId,
            title: parasha ? (shabbat?.parsha || "") : slide.title,
            detail: slide.detail,
            candles: parasha ? shabbat?.candles || "" : "",
            city: parasha ? shabbat?.city || city : "",
            verses: parasha ? shabbat?.verses || [] : [],
            still: parasha && flow === "static",
            };
          })} />
        )}
      </section>
      <aside className="rail">
        {modern ? (
          <ModernRail
            address={address(street, number, city)}
            logoUrl={screen.logoUrl || source.logoUrl}
            temp={weather?.temp ?? null}
            weatherLabel={weather?.label || ""}
            candles={shabbat?.candles || ""}
            parsha={shabbat?.parsha || ""}
            rates={rates}
            notices={notices.map((notice) => notice.text)}
          />
        ) : (
          <>
            <div className="address">{address(street, number, city)}</div>
            {(screen.logoUrl || source.logoUrl) ? <img className="logo" src={screen.logoUrl || source.logoUrl} alt="" /> : null}
            <Clock />
            <Weather temp={weather?.temp ?? null} label={weather?.label || ""} />
            <Shabbat candles={shabbat?.candles || ""} parsha={shabbat?.parsha || ""} />
            <Notices items={notices.map((notice) => notice.text)} />
            <Directory floors={indexTheme ? [] : floors} />
            <Markets rows={rates} />
          </>
        )}
      </aside>
      <NewsTicker titles={headlines.map((item) => item.title)} seconds={screen.tickerSeconds || 12} source={newsName} />
    </main>
  );
}
