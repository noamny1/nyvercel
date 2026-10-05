"""Print the site logo on the character's red shirt and round the cut head.

The mark is the white nytv.app header logo (icon + NYMEDIA, no slogan).
It is a fixed-size print. It stays still while the character is still,
and it is hidden when the shirt is turned away or covered.

The title bar is shortened just below the Hebrew, and a dome is painted
so the head is no longer sliced flat. Text on the right is left as-is.

Reads clean clips from assets/safety-raw and writes public/safety.
Re-run after adding a new character video: python3 scripts/stamp-shirt.py
"""

import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "assets" / "safety-raw"
OUT = ROOT / "public" / "safety"
LOGO_SRC = ROOT / "public" / "logo-nymedia.png"
FFMPEG = "/usr/local/bin/ffmpeg"
BANNER_NEW = 154
FOREHEAD = 233
LOGO_W = 118


def is_shirt(r, g, b):
    return 80 < r < 170 and g < 80 and b < 110 and r > g + 40 and r > b + 20


def is_skin(r, g, b):
    return r > 190 and 150 < g < 245 and 120 < b < 220 and (r - b) > 18 and (r - g) < 55 and g + 8 > b


def is_text(r, g, b):
    return r > 220 and g > 220 and b > 220


def site_logo():
    im = Image.open(LOGO_SRC).convert("RGBA")
    w, h = im.size
    px = im.load()
    ink = [sum(1 for x in range(w) if px[x, y][3] > 40) for y in range(h)]
    last_quiet = None
    quiet = 0
    for y, n in enumerate(ink):
        if n < 20:
            quiet += 1
            if quiet == 6 and y > h * 0.55:
                last_quiet = y - 5
        else:
            quiet = 0
    cut = last_quiet or h
    crop = im.crop((0, 0, w, cut))
    crop = crop.crop(crop.getbbox())
    white = Image.new("RGBA", crop.size, (0, 0, 0, 0))
    src, dst = crop.load(), white.load()
    for y in range(crop.height):
        for x in range(crop.width):
            a = src[x, y][3]
            if a:
                dst[x, y] = (255, 255, 255, a)
    return white


def scene_pixel(r, g, b):
    if is_shirt(r, g, b) or is_skin(r, g, b):
        return False
    if r < 165 or g < 150:
        return False
    return True


def wall_pixel(r, g, b):
    return r > 220 and g > 210 and b > 195 and not is_skin(r, g, b) and not is_shirt(r, g, b)


def find_head(px, w, h):
    """Forehead span. Only a dark eye-gap is bridged, never the wall or a door."""
    best = None
    score = -1
    for row in (230, 232, 234):
        if row >= h:
            continue
        skin_at = [is_skin(*px[x, row]) for x in range(w)]
        x = 0
        while x < w:
            if not skin_at[x]:
                x += 1
                continue
            a = x
            while x < w:
                if skin_at[x]:
                    x += 1
                    continue
                gap = x
                dark = True
                while gap < w and not skin_at[gap] and gap - x < 34:
                    r, g, b = px[gap, row]
                    if r > 120 or g > 110:
                        dark = False
                        break
                    gap += 1
                if dark and gap < w and skin_at[gap] and gap - x < 34:
                    x = gap
                    continue
                break
            width = x - a
            if width < 80 or width > 440 or a < 8:
                continue
            mid = (a + x) // 2
            reds = 0
            for y in range(row + 55, min(h, row + 230), 4):
                for xx in range(max(0, mid - 36), min(w, mid + 36), 4):
                    if is_shirt(*px[xx, y]):
                        reds += 1
            if reds > score:
                score = reds
                best = (a, x)
    if not best or score < 18:
        return None
    ha, hb = best
    y = 229

    def on_cut(x):
        r, g, b = px[x, y]
        if is_skin(r, g, b):
            return True
        return r < 150 and g < 130 and b < 130

    while ha > 8 and on_cut(ha - 1):
        ha -= 1
    while hb < w - 1 and on_cut(hb):
        hb += 1
    return (ha, hb)


def open_head(im, head=None):
    """Lower the burgundy bar and round the head that was cut flat against it."""
    frame = im.convert("RGB")
    original = frame.copy()
    px = frame.load()
    src = original.load()
    w, h = frame.size
    if h <= FOREHEAD + 8:
        return frame
    if head is None:
        head = find_head(px, w, h)
    ha, hb = head if head else (10 ** 9, -1)
    bg_y = min(h - 1, 238)
    known = []
    bright = []
    for x in range(w):
        r, g, b = src[x, bg_y]
        in_head = ha - 16 <= x < hb + 40
        known.append(None if in_head or not scene_pixel(r, g, b) else (r, g, b))
        bright.append(None if in_head or not wall_pixel(r, g, b) else (r, g, b))
    def nearest(source):
        left_c = [None] * w
        left_d = [10 ** 9] * w
        last, dist = None, 10 ** 9
        for x in range(w):
            if source[x] is not None:
                last, dist = source[x], 0
            else:
                dist += 1
            left_c[x], left_d[x] = last, dist
        right_c = [None] * w
        right_d = [10 ** 9] * w
        last, dist = None, 10 ** 9
        for x in range(w - 1, -1, -1):
            if source[x] is not None:
                last, dist = source[x], 0
            else:
                dist += 1
            right_c[x], right_d[x] = last, dist
        return left_c, left_d, right_c, right_d

    wall_l, wall_ld, wall_r, wall_rd = nearest(bright)
    for y in range(BANNER_NEW, FOREHEAD):
        for x in range(w):
            if is_text(*src[x, y]):
                continue
            if ha <= x < hb:
                if wall_ld[x] <= wall_rd[x] and wall_l[x] is not None:
                    px[x, y] = wall_l[x]
                elif wall_r[x] is not None:
                    px[x, y] = wall_r[x]
                continue
            if known[x] is not None:
                px[x, y] = known[x]
            elif wall_ld[x] <= wall_rd[x] and wall_l[x] is not None:
                px[x, y] = wall_l[x]
            elif wall_r[x] is not None:
                px[x, y] = wall_r[x]

    cx = (ha + hb) / 2

    samples = []
    for x in range(ha, hb):
        r, g, b = src[x, FOREHEAD]
        if is_skin(r, g, b):
            samples.append((r, g, b))
    if not samples:
        return frame
    samples.sort()
    base = samples[len(samples) // 2]

    rx = (hb - ha) / 2 + 3
    ry = min(rx * 0.72, 96)
    cy = float(FOREHEAD)
    top = max(0, int(cy - ry))
    for y in range(top, FOREHEAD):
        for x in range(max(0, int(cx - rx) - 1), min(w, int(cx + rx) + 2)):
            if is_text(*src[x, y]):
                continue
            nx = (x + 0.5 - cx) / rx
            ny = (y + 0.5 - cy) / ry
            dist = nx * nx + ny * ny
            if dist >= 1.08:
                continue
            sr, sg, sb = base
            height = (cy - y) / ry
            side = min(1.0, abs(x - cx) / rx)
            light = 1 + 0.05 * height * (1 - side * side)
            cr = min(255, int(sr * light))
            cg = min(255, int(sg * light))
            cb = min(255, int(sb * light))
            # Melt the new crown into the real forehead so there is no seam.
            join = (cy - y) / 18
            if join < 1:
                er, eg, eb = src[min(w - 1, max(0, x)), FOREHEAD]
                if not is_skin(er, eg, eb):
                    er, eg, eb = sr, sg, sb
                cr = int(er * (1 - join) + cr * join)
                cg = int(eg * (1 - join) + cg * join)
                cb = int(eb * (1 - join) + cb * join)
            if dist <= 1:
                px[x, y] = (cr, cg, cb)
            else:
                blend = (1.08 - dist) / 0.08
                br, bgc, bb = px[x, y]
                px[x, y] = (
                    int(br * (1 - blend) + cr * blend),
                    int(bgc * (1 - blend) + cg * blend),
                    int(bb * (1 - blend) + cb * blend),
                )
    # Drop hairline leftovers beside the crown. Leave the door frames alone.
    if ha < hb:
        for y in range(BANNER_NEW, FOREHEAD):
            x = 0
            while x < w:
                r, g, b = px[x, y]
                if r > 230 and g > 220:
                    x += 1
                    continue
                a = x
                while x < w and not (px[x, y][0] > 230 and px[x, y][1] > 220):
                    x += 1
                if x - a <= 5 and ha - 70 <= a <= hb + 70 and px[a, y][0] < 205:
                    fill = px[max(0, a - 1), y]
                    for xx in range(a, x):
                        px[xx, y] = fill
    return frame


def shirt_center(im):
    px = im.load()
    w, h = im.size
    y_cut = int(h * 0.40)
    gw, gh = w // 2, h // 2
    mask = [False] * (gw * gh)
    for y in range(y_cut, h, 2):
        row = (y // 2) * gw
        for x in range(0, w, 2):
            if is_shirt(*px[x, y]):
                mask[row + x // 2] = True
    seen = [False] * len(mask)
    best = None
    for i, on in enumerate(mask):
        if not on or seen[i]:
            continue
        stack = [i]
        seen[i] = True
        cells = []
        while stack:
            cur = stack.pop()
            cells.append(cur)
            cy, cx = divmod(cur, gw)
            for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                if nx < 0 or ny < 0 or nx >= gw or ny >= gh:
                    continue
                j = ny * gw + nx
                if mask[j] and not seen[j]:
                    seen[j] = True
                    stack.append(j)
        if best is None or len(cells) > len(best):
            best = cells
    if not best or len(best) < 350:
        return None
    xs = [c % gw for c in best]
    ys = [c // gw for c in best]
    bw = (max(xs) - min(xs)) * 2
    bh = (max(ys) - min(ys)) * 2
    if bw < 200 or bh < 110 or not (0.85 <= bw / max(1, bh) <= 2.6):
        return None
    return (sum(xs) / len(xs) * 2, sum(ys) / len(ys) * 2)


def logo_mark(logo):
    return logo.resize((LOGO_W, max(1, int(logo.height * LOGO_W / logo.width))), Image.Resampling.LANCZOS)


def logo_sits(px, w, h, mark, ox, oy):
    src = mark.load()
    hit = miss = 0
    mw, mh = mark.size
    for y in range(0, mh, 2):
        for x in range(0, mw, 2):
            if src[x, y][3] < 90:
                continue
            dx, dy = ox + x, oy + y
            if dx < 0 or dy < 0 or dx >= w or dy >= h or not is_shirt(*px[dx, dy][:3]):
                miss += 1
            else:
                hit += 1
    return hit > 30 and miss <= max(2, hit * 0.04)


def apply_print(im, mark, center):
    """White ink that follows the cloth, so it reads as a print rather than a sticker."""
    if not center:
        return im
    ox = int(round(center[0] - mark.width / 2))
    oy = int(round(center[1] - mark.height / 2))
    px = im.load()
    if not logo_sits(px, im.width, im.height, mark, ox, oy):
        return im
    src = mark.load()
    mw, mh = mark.size
    w, h = im.size
    for y in range(mh):
        for x in range(mw):
            a = src[x, y][3]
            if a < 8:
                continue
            dx, dy = ox + x, oy + y
            if dx < 0 or dy < 0 or dx >= w or dy >= h:
                continue
            r, g, b = px[dx, dy]
            lit = (r * 0.7 + g * 0.2 + b * 0.1 - 26) / 85
            if lit < 0.9:
                lit = 0.9
            elif lit > 1:
                lit = 1
            k = (a / 255) * 0.98
            px[dx, dy] = (
                int(r * (1 - k) + 255 * lit * k),
                int(g * (1 - k) + 250 * lit * k),
                int(b * (1 - k) + 244 * lit * k),
            )
    return im


def plan_prints(centers):
    """Median, then a dead-zone, so noise does not slide or blink the print."""
    n = len(centers)
    med = [None] * n
    for i, center in enumerate(centers):
        if not center:
            continue
        window = [centers[j] for j in range(max(0, i - 3), min(n, i + 4)) if centers[j]]
        if len(window) < 4:
            continue
        xs = sorted(p[0] for p in window)
        ys = sorted(p[1] for p in window)
        med[i] = (xs[len(xs) // 2], ys[len(ys) // 2])
    pos = None
    on = off = 0
    showing = False
    out = []
    for center in med:
        if center:
            off = 0
            on += 1
            if pos is None:
                pos = center
            else:
                dx, dy = center[0] - pos[0], center[1] - pos[1]
                if dx * dx + dy * dy > 25:
                    pos = (pos[0] + dx * 0.55, pos[1] + dy * 0.55)
            showing = on >= 6
        else:
            on = 0
            off += 1
            if off >= 5:
                showing = False
                pos = None
        out.append(pos if showing else None)
    return out


def frames_of(src, folder):
    folder.mkdir(parents=True, exist_ok=True)
    for old in folder.glob("f*.jpg"):
        old.unlink()
    subprocess.check_call(
        [FFMPEG, "-y", "-i", str(src), "-q:v", "2", str(folder / "f%04d.jpg")],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def encode(folder, dest):
    subprocess.check_call(
        [
            FFMPEG, "-y", "-framerate", "24", "-i", str(folder / "f%04d.jpg"),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
            "-movflags", "+faststart", "-an", str(dest),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def main():
    logo = site_logo()
    logo.save(ROOT / "assets" / "logo-shirt.png")
    mark = logo_mark(logo)
    names = sorted({p.stem for p in RAW.iterdir() if p.suffix in {".mp4", ".jpg"}})
    if not names:
        sys.exit(f"no clips in {RAW}")
    work = Path("/tmp/shirt-frames")
    OUT.mkdir(parents=True, exist_ok=True)
    for name in names:
        poster = RAW / f"{name}.jpg"
        if poster.exists():
            opened = open_head(Image.open(poster))
            apply_print(opened, mark, shirt_center(opened)).save(OUT / f"{name}.jpg", quality=90)
            print("poster", name, flush=True)
        video = RAW / f"{name}.mp4"
        if not video.exists():
            continue
        folder = work / name
        frames_of(video, folder)
        files = sorted(folder.glob("f*.jpg"))
        opened = []
        centers = []
        for frame in files:
            image = open_head(Image.open(frame))
            center = shirt_center(image)
            if center and not logo_sits(
                image.load(), image.width, image.height, mark,
                int(round(center[0] - mark.width / 2)),
                int(round(center[1] - mark.height / 2)),
            ):
                center = None
            centers.append(center)
            opened.append(image)
        planned = plan_prints(centers)
        for frame, image, center in zip(files, opened, planned):
            apply_print(image, mark, center).save(frame, quality=92)
        encode(folder, OUT / f"{name}.mp4")
        shown = sum(1 for c in planned if c)
        print("video", name, len(files), "print", shown, flush=True)
    print("done", ", ".join(names), flush=True)


if __name__ == "__main__":
    main()
