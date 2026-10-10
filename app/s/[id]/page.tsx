import { Heebo } from "next/font/google";
import { notFound } from "next/navigation";
import { Player } from "@/components/player/Player";
import { FitStage } from "@/components/player/FitStage";
import { Music } from "@/components/player/Music";
import { Wake } from "@/components/player/Wake";
import { Ping } from "@/components/player/Ping";
import { NewsGate } from "@/components/player/NewsGate";
import { Clock } from "@/components/widgets/Clock";
import { Directory } from "@/components/widgets/Directory";
import { Markets } from "@/components/widgets/Markets";
import { NewsTicker } from "@/components/widgets/NewsTicker";
import { Notices } from "@/components/widgets/Notices";
import { Shabbat } from "@/components/widgets/Shabbat";
import { Weather } from "@/components/widgets/Weather";
import { ModernRail } from "@/components/themes/ModernRail";
import { LuxuryRail } from "@/components/themes/LuxuryRail";
import { CinemaBoard, GlassBoard } from "@/components/themes/MotionBoard";
import { markets } from "@/lib/markets";
import { liveHeadlines } from "@/lib/news";
import { prisma } from "@/lib/prisma";
import { musicSilenced, screenTakeover } from "@/lib/flags";
import { FIXED_VIDEOS, clientSetsDuration, fillLine } from "@/lib/ready-slides";
import { newsTickerOn, slideIsOn } from "@/lib/schedule";
import { shabbatFor } from "@/lib/shabbat";
import { isThemeId } from "@/lib/themes";
import { weatherFor } from "@/lib/weather";
import "@/components/player/player.css";
import "@/components/themes/modern.css";
import "@/components/themes/luxury.css";
import "@/components/themes/motion.css";

const heebo = Heebo({ subsets: ["hebrew", "latin"], weight: ["300", "400", "500"], display: "swap" });

export const dynamic = "force-dynamic";

function address(street: string, number: string, city: string) {
  const line = [street, number].filter(Boolean).join(" ");
  return [line, city].filter(Boolean).join(", ");
}

function welcome(street: string, number: string, city: string) {
  return { line: [street, number].filter(Boolean).join(" "), city };
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
  const chosen = screen.theme || source.theme || "modern";
  const theme = isThemeId(chosen) ? chosen : "modern";
  const luxury = theme === "luxury";
  const cinematic = theme === "glass" || theme === "cinema";
  const newsSource = screen.newsSource || source.newsSource || "ynet";
  const sourceCount = newsSource.split(",").map((item) => item.trim()).filter(Boolean).length || 1;
  const modern = theme === "modern";
  const newsTake = luxury
    ? Math.min(20, Math.max(screen.newsCount || 8, sourceCount * 4))
    : modern
      ? Math.min(20, sourceCount * 3)
      : (screen.newsCount || 8);

  const [weather, shabbat, headlines, rates, silenced, takeover] = await Promise.all([
    weatherFor(city).catch(() => null),
    shabbatFor(city).catch(() => null),
    liveHeadlines(newsSource, newsTake).catch(() => []),
    markets().catch(() => []),
    musicSilenced(),
    screenTakeover(),
  ]);
  const greet = welcome(street, number, city);
  const feedMode = screen.feedMode === "news" || screen.feedMode === "notices" ? screen.feedMode : "both";
  const stories = headlines.map((item) => ({ title: item.title, source: item.source || "" }));
  const newsMode = screen.newsTicker || "on";
  const tickerOn = newsTickerOn(newsMode);

  const indexTheme = theme.startsWith("index");
  const floors = screen.group?.floors ?? [];

  if (takeover.on && takeover.image) {
    return (
      <main className="takeover">
        <Wake />
        <Ping code={screen.code || screen.id} revision={screen.revision} />
        <img src={takeover.image} alt="" />
      </main>
    );
  }

  return (
    <FitStage className={`stage theme-${theme}${luxury ? ` layout-luxury ${heebo.className}` : ""}${modern ? " layout-modern" : ""}${cinematic ? ` layout-${theme} ${heebo.className}` : ""}${tickerOn && !luxury && !modern && !cinematic ? "" : " no-ticker"}`}>
      <Music playlist={silenced ? "off" : screen.musicPlaylist || ""} url={silenced ? "" : screen.group?.musicUrl || ""} start={screen.id} />
      <NewsGate mode={newsMode} />
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
            const character = Boolean(official?.url.startsWith("/safety/"));
            const parasha = slide.templateId === "weekly-parasha";
            let flow = "";
            let full = false;
            let day = "";
            let from = "";
            let to = "";
            let token = "";
            try {
              const stored = JSON.parse(slide.meta || "{}") as { flow?: string; full?: boolean; day?: string; from?: string; to?: string; token?: string };
              flow = stored.flow || "";
              full = stored.full === true;
              day = stored.day || "";
              from = stored.from || "";
              to = stored.to || "";
              token = stored.token || "";
            } catch { flow = ""; }
            const slow = parasha ? Math.max(180, slide.duration || 0, flow === "static" ? 180 : Math.round((shabbat?.verses.length || 40) * 2.2)) : 0;
            const meta = { day, from, to };
            return {
            imageUrl: official?.url || slide.imageUrl,
            duration: clientSetsDuration(slide.templateId) ? slide.duration : official?.duration || slow || slide.duration,
            kind: slide.kind,
            templateId: slide.templateId,
            title: parasha ? (shabbat?.parsha || "") : character && official ? official.title : fillLine(slide.title, meta),
            detail: character && official ? official.line : fillLine(slide.detail, meta),
            candles: parasha ? shabbat?.candles || "" : "",
            havdalah: parasha ? shabbat?.havdalah || "" : "",
            city: parasha ? shabbat?.city || city : "",
            verses: parasha ? shabbat?.verses || [] : [],
            still: parasha && flow === "static",
            full,
            day,
            from,
            token,
            };
          })} />
        )}
      </section>
      <aside className="rail">
        {luxury ? (
          <LuxuryRail
            temp={weather?.temp ?? null}
            weatherLabel={weather?.label || ""}
            mode={feedMode}
            headlines={stories}
            notices={notices.map((notice) => notice.text)}
            sourceId={newsSource}
            newsCount={newsTake}
            newsMode={newsMode}
          />
        ) : modern ? (
          <ModernRail
            address={address(street, number, city)}
            logoUrl={screen.logoUrl || source.logoUrl}
            temp={weather?.temp ?? null}
            weatherLabel={weather?.label || ""}
            candles={shabbat?.candles || ""}
            parsha={shabbat?.parsha || ""}
            rates={rates}
            notices={notices.map((notice) => notice.text)}
            headlines={stories}
            sourceId={newsSource}
            newsCount={newsTake}
            newsMode={newsMode}
            seconds={screen.tickerSeconds || 8}
          />
        ) : cinematic ? null : (
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
      {luxury ? (
        <footer className="luxury-foot">
          <div className="lux-address">
            <small>ברוכים הבאים</small>
            {greet.line || greet.city ? (
              <strong>
                {greet.line ? <span>{greet.line}</span> : null}
                {greet.line && greet.city ? <i /> : null}
                {greet.city ? <span>{greet.city}</span> : null}
              </strong>
            ) : null}
          </div>
          <div className={`lux-logo${(screen.logoUrl || source.logoUrl) ? " is-photo" : " is-empty"}`}>
            {(screen.logoUrl || source.logoUrl) ? <img src={screen.logoUrl || source.logoUrl} alt="" /> : <span>לוגו הלקוח<small>הבניין</small></span>}
          </div>
        </footer>
      ) : null}
      {!luxury && !modern && !cinematic ? <NewsTicker titles={stories} seconds={screen.tickerSeconds || 12} sourceId={newsSource} take={screen.newsCount || 8} mode={newsMode} /> : null}
      {theme === "glass" ? (
        <GlassBoard
          temp={weather?.temp ?? null}
          weatherLabel={weather?.label || ""}
          notices={notices.map((notice) => notice.text)}
          headlines={stories}
          street={street}
          number={number}
          city={city}
          logoUrl={screen.logoUrl || source.logoUrl}
          newsMode={newsMode}
        />
      ) : null}
      {theme === "cinema" ? (
        <CinemaBoard
          temp={weather?.temp ?? null}
          weatherLabel={weather?.label || ""}
          notices={notices.map((notice) => notice.text)}
          headlines={stories}
          street={street}
          number={number}
          city={city}
          logoUrl={screen.logoUrl || source.logoUrl}
          newsMode={newsMode}
        />
      ) : null}
      <footer className="brand-bar"><img src="/nymedia-logo.png" alt="NYmedia" /></footer>
    </FitStage>
  );
}
