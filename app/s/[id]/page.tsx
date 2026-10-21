import { Heebo } from "next/font/google";
import { notFound } from "next/navigation";
import { Player } from "@/components/player/Player";
import { FitStage } from "@/components/player/FitStage";
import { lobbyClock } from "@/lib/lobby-clock";
import { Music } from "@/components/player/Music";
import { Wake } from "@/components/player/Wake";
import { Ping } from "@/components/player/Ping";
import { RemoteLink } from "@/components/player/RemoteLink";
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
import { FaultCopy, WelcomeLine, faultPayload, faultQrSrc } from "@/components/themes/FaultParts";
import { CinemaBoard, GlassBoard } from "@/components/themes/MotionBoard";
import { markets } from "@/lib/markets";
import { liveHeadlines } from "@/lib/news";
import { prisma } from "@/lib/prisma";
import { musicSilenced, screenTakeover } from "@/lib/flags";
import { FIXED_VIDEOS, clientSetsDuration, fillLine } from "@/lib/ready-slides";
import { newsTickerOn, slideIsOn } from "@/lib/schedule";
import { shabbatFor } from "@/lib/shabbat";
import { isThemeId, isFaultTheme } from "@/lib/themes";
import { weatherFor } from "@/lib/weather";
import "@/components/player/player.css";
import "@/components/themes/modern.css";
import "@/components/themes/luxury.css";
import "@/components/themes/fault.css";
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
  const picked = screen.theme || source.theme || "modern";
  const chosen = picked === "fault-card" || picked === "fault-night" ? "luxury" : picked;
  const theme = isThemeId(chosen) ? chosen : "modern";
  const luxury = theme === "luxury" || theme === "luxury720";
  const fault = isFaultTheme(theme);
  const wide = theme === "luxury720";
  const clock = lobbyClock();
  const cinematic = theme === "glass" || theme === "cinema";
  const newsSource = screen.newsSource || source.newsSource || "ynet";
  const sourceCount = newsSource.split(",").map((item) => item.trim()).filter(Boolean).length || 1;
  const modern = theme === "modern";
  const newsTake = luxury || fault
    ? Math.min(20, Math.max(screen.newsCount || 8, sourceCount * 4))
    : modern
      ? Math.min(20, sourceCount * 3)
      : (screen.newsCount || 8);

  const [weather, shabbat, headlines, rates, silenced, takeover] = await Promise.all([
    weatherFor([city, screen.name, source.name].filter(Boolean).join(" ")).catch(() => null),
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
        <RemoteLink code={screen.code || screen.id} />
        <img src={takeover.image} alt="" />
      </main>
    );
  }

  const faultPhone = (screen.faultPhone || source.faultPhone || "").trim();
  const faultLink = (screen.faultLink || source.faultLink || "").trim();
  const faultImage = (screen.faultQrUrl || source.faultQrUrl || "").trim();
  const faultTarget = faultPayload(faultPhone, faultLink);
  const qr = fault
    ? (faultImage || (faultTarget ? await faultQrSrc(faultTarget, theme === "fault-logo" ? 480 : 240) : ""))
    : "";
  const logoUrl = screen.logoUrl || source.logoUrl;

  return (
    <>
    <FitStage width={wide ? 1280 : 1366} height={wide ? 720 : 768} fill={wide ? 1 : 0.97} code={screen.code || screen.id} revision={screen.revision} className={`stage theme-${theme}${luxury ? ` layout-luxury ${heebo.className}` : ""}${fault ? ` layout-luxury ${theme} ${heebo.className}` : ""}${wide ? " layout-luxury720" : ""}${modern ? " layout-modern" : ""}${cinematic ? ` layout-${theme} ${heebo.className}` : ""}${tickerOn && !luxury && !modern && !cinematic && !fault ? "" : " no-ticker"}`}>
      <Music playlist={silenced ? "off" : screen.musicPlaylist || ""} url={silenced ? "" : screen.group?.musicUrl || ""} start={screen.id} days={screen.musicDays} from={screen.musicFrom} until={screen.musicUntil} />
      <NewsGate mode={newsMode} />
      <Wake />
      <Ping code={screen.code || screen.id} revision={screen.revision} />
      <RemoteLink code={screen.code || screen.id} />
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
        {(luxury || fault) ? (
          <>
            <LuxuryRail
              temp={weather?.temp ?? null}
              weatherLabel={weather?.label || ""}
              mode={feedMode}
              headlines={stories}
              notices={notices.map((notice) => notice.text)}
              sourceId={newsSource}
              newsCount={wide ? 3 : newsTake}
              newsMode={newsMode}
              compact={wide}
              initialTime={clock.time}
              initialCivil={clock.civil}
              initialHebrew={clock.hebrew}
            />
            {theme === "fault-column" ? <div className="fault-dock"><FaultCopy qr={qr} phone={faultPhone} /></div> : null}
          </>
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
      {(luxury || theme === "fault-column") ? (
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
          <div className={`lux-logo${logoUrl ? " is-photo" : " is-empty"}`}>
            {logoUrl ? <img src={logoUrl} alt="" /> : <span>לוגו הלקוח<small>הבניין</small></span>}
          </div>
        </footer>
      ) : null}
      {theme === "fault-bar" ? (
        <footer className="luxury-foot">
          <div className="lux-address">
            <WelcomeLine line={greet.line} city={greet.city} />
            <i className="fault-split" />
            <FaultCopy qr={qr} phone={faultPhone} />
          </div>
          <div className={`lux-logo${logoUrl ? " is-photo" : " is-empty"}`}>
            {logoUrl ? <img src={logoUrl} alt="" /> : <span>לוגו הלקוח<small>הבניין</small></span>}
          </div>
        </footer>
      ) : null}
      {theme === "fault-logo" ? (
        <>
          <div className={`fault-logo-card lux-logo${logoUrl ? " is-photo" : " is-empty"}`}>
            {logoUrl ? <img src={logoUrl} alt="" /> : <span>לוגו הלקוח<small>הבניין</small></span>}
          </div>
          <div className="fault-side">
            {qr ? <img src={qr} alt="" /> : null}
            <b>פתיחת תקלה</b>
            <small>סריקה מהנייד</small>
            {faultPhone ? <strong>{faultPhone}</strong> : null}
          </div>
          <footer className="luxury-foot">
            <div className="lux-address">
              <WelcomeLine line={greet.line} city={greet.city} />
            </div>
          </footer>
        </>
      ) : null}
      {!luxury && !fault && !modern && !cinematic ? <NewsTicker titles={stories} seconds={screen.tickerSeconds || 12} sourceId={newsSource} take={screen.newsCount || 8} mode={newsMode} /> : null}
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
    <script dangerouslySetInnerHTML={{ __html: `
(function () {
  function lastSunday(year, month) {
    var last = new Date(Date.UTC(year, month + 1, 0));
    return last.getUTCDate() - last.getUTCDay();
  }
  function israelText() {
    var now = new Date();
    var year = now.getUTCFullYear();
    var start = Date.UTC(year, 2, lastSunday(year, 2) - 2, 0, 0, 0);
    var end = Date.UTC(year, 9, lastSunday(year, 9) - 1, 23, 0, 0);
    var time = now.getTime();
    var off = time >= start && time < end ? 3 : 2;
    var dayMin = Math.floor((time + off * 3600000) / 60000) % 1440;
    if (dayMin < 0) dayMin += 1440;
    var hours = Math.floor(dayMin / 60);
    var minutes = dayMin % 60;
    return (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes;
  }
  function paintClock() {
    var text = israelText();
    var nodes = document.getElementsByClassName("lux-clock");
    var i;
    for (i = 0; i < nodes.length; i++) if (nodes[i].textContent !== text) nodes[i].textContent = text;
    nodes = document.getElementsByClassName("clock");
    for (i = 0; i < nodes.length; i++) if (nodes[i].textContent !== text) nodes[i].textContent = text;
    var boards = document.getElementsByClassName("modern-clock");
    for (i = 0; i < boards.length; i++) {
      var strong = boards[i].getElementsByTagName("strong")[0];
      if (strong && strong.textContent !== text) strong.textContent = text;
    }
  }
  paintClock();
  window.setInterval(paintClock, 250);
  function start() {
  function hushPromo() {
    var clips = document.querySelectorAll("video[data-silent]");
    var i;
    for (i = 0; i < clips.length; i++) {
      clips[i].muted = true;
      clips[i].defaultMuted = true;
      clips[i].volume = 0;
    }
  }
  hushPromo();
  window.setInterval(hushPromo, 1000);
  var stage = document.querySelector("main.stage");
  var code = stage ? stage.getAttribute("data-code") : "";
  window.__nyPageBeat = 1;
  if (code) {
    var revision = stage.getAttribute("data-rev") || "";
    var beat = function () {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "/api/ping?code=" + encodeURIComponent(code) + "&beat=1", true);
        xhr.onreadystatechange = function () {
          if (xhr.readyState !== 4 || xhr.status < 200 || xhr.status >= 300) return;
          try {
            var data = JSON.parse(xhr.responseText);
            if (data && data.r && String(data.r) !== String(revision)) {
              revision = String(data.r);
              location.replace(location.pathname + "?v=" + data.r);
            }
          } catch (err) {}
        };
        xhr.send();
      } catch (err) {}
    };
    beat();
    window.setInterval(beat, 5 * 60 * 1000);
  }
  var root = document.getElementById("slide-stack");
  if (!root) return;
  var nodes = root.getElementsByClassName("slide-pane");
  if (!nodes.length || nodes.length < 2) return;
  var index = 0;
  function seconds(node) {
    var value = parseInt(node.getAttribute("data-sec") || "8", 10);
    if (!value || value < 3) return 8;
    return value;
  }
  function wake(node) {
    var videos = node.getElementsByTagName("video");
    var frames = node.getElementsByTagName("iframe");
    var i;
    for (i = 0; i < videos.length; i++) {
      var video = videos[i];
      var media = video.getAttribute("data-media");
      if (media && !video.getAttribute("src")) video.setAttribute("src", media);
      video.muted = true;
      video.defaultMuted = true;
      if (video.getAttribute("data-silent") === "1") video.volume = 0;
      try { video.play(); } catch (err) {}
    }
    var pictures = node.getElementsByTagName("img");
    for (i = 0; i < pictures.length; i++) {
      var picture = pictures[i];
      var pic = picture.getAttribute("data-media");
      if (pic && !picture.getAttribute("src")) picture.setAttribute("src", pic);
    }
    for (i = 0; i < frames.length; i++) {
      var frame = frames[i];
      var src = frame.getAttribute("data-media");
      if (src && !frame.getAttribute("src")) frame.setAttribute("src", src);
    }
  }
  function show(next) {
    var i;
    for (i = 0; i < nodes.length; i++) {
      if (i === next) {
        nodes[i].className = "slide-pane";
        wake(nodes[i]);
      } else {
        nodes[i].className = "slide-pane is-off";
      }
    }
  }
  function tick() {
    window.setTimeout(function () {
      if (document.documentElement.getAttribute("data-player") === "live") return;
      index = (index + 1) % nodes.length;
      show(index);
      tick();
    }, seconds(nodes[index]) * 1000);
  }
  tick();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
` }} />
    </>
  );
}
