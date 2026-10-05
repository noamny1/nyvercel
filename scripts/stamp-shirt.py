"""Print the site logo on the character's red shirt.

The mark is the white nytv.app header logo (icon + NYMEDIA, no slogan).
It is a still print on the chest, clipped to the red fabric. When the shirt
is turned away, covered, or not in frame, the logo is not drawn.

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

# Shirt red, not the cream body and not the green/blue logo already printed.
def is_shirt(r, g, b):
    return r > 90 and r > g + 30 and r > b + 10 and g < 140 and b < 160


def site_logo():
    im = Image.open(LOGO_SRC).convert("RGBA")
    w, h = im.size
    px = im.load()
    ink = []
    for y in range(h):
        n = sum(1 for x in range(w) if px[x, y][3] > 40)
        ink.append(n)
    # Drop the bottom slogan band. It sits under a quiet gap.
    cut = h
    gap = 0
    seen = False
    for y, n in enumerate(ink):
        if n > 40:
            seen = True
            gap = 0
        elif seen:
            gap += 1
            if gap >= 8:
                cut = y - gap + 1
                # keep going only if nothing wide remains; slogan is the last band
    # find last wide row after the gap and cut before that band
    last_quiet = None
    quiet = 0
    for y, n in enumerate(ink):
        if n < 20:
            quiet += 1
            if quiet == 6 and y > h * 0.55:
                last_quiet = y - 5
        else:
            quiet = 0
    if last_quiet:
        cut = last_quiet
    crop = im.crop((0, 0, w, cut))
    bbox = crop.getbbox()
    crop = crop.crop(bbox)
    white = Image.new("RGBA", crop.size, (0, 0, 0, 0))
    src = crop.load()
    dst = white.load()
    for y in range(crop.height):
        for x in range(crop.width):
            a = src[x, y][3]
            if a:
                dst[x, y] = (255, 255, 255, a)
    return white


def shirt_box(im):
    """Front-facing red shirt only. Narrow, bent, or covered chests return None."""
    small = im.convert("RGB").resize((320, 180))
    px = small.load()
    seen = [[False] * 320 for _ in range(180)]
    best = None
    y_cut = int(180 * 0.34)
    for y in range(y_cut, 180):
        for x in range(320):
            if seen[y][x]:
                continue
            r, g, b = px[x, y]
            if not is_shirt(r, g, b):
                continue
            stack = [(x, y)]
            seen[y][x] = True
            cells = []
            while stack:
                cx, cy = stack.pop()
                cells.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < y_cut or nx >= 320 or ny >= 180 or seen[ny][nx]:
                        continue
                    rr, gg, bb = px[nx, ny]
                    if is_shirt(rr, gg, bb):
                        seen[ny][nx] = True
                        stack.append((nx, ny))
            if best is None or len(cells) > len(best):
                best = cells
    if not best or len(best) < 80:
        return None
    xs = [c[0] for c in best]
    ys = [c[1] for c in best]
    sx = im.width / 320
    sy = im.height / 180
    box = (min(xs) * sx, min(ys) * sy, (max(xs) + 1) * sx, (max(ys) + 1) * sy)
    if not front_shirt(box):
        return None
    return box


def front_shirt(box):
    x0, y0, x1, y1 = box
    bw, bh = x1 - x0, y1 - y0
    if bw < 270 or bh < 150:
        return False
    return 1.15 <= bw / bh <= 2.05


def stamp(im, logo, box="auto"):
    if box == "auto":
        box = shirt_box(im)
    if not box or not front_shirt(box):
        return im.convert("RGB")
    x0, y0, x1, y1 = box
    bw, bh = x1 - x0, y1 - y0
    # One print size. It does not grow or slide around on its own.
    lw = min(bw * 0.50, 168)
    scale = lw / logo.width
    lh = logo.height * scale
    mark = logo.resize((max(1, int(lw)), max(1, int(lh))), Image.Resampling.LANCZOS)
    px = int(x0 + (bw - mark.width) / 2)
    py = int(y0 + bh * 0.54 - mark.height / 2)
    base = im.convert("RGBA")
    src = mark.load()
    dst = base.load()
    for y in range(mark.height):
        for x in range(mark.width):
            a = src[x, y][3]
            if a < 16:
                continue
            dx, dy = px + x, py + y
            if dx < 0 or dy < 0 or dx >= base.width or dy >= base.height:
                continue
            br, bg, bb, _ = dst[dx, dy]
            if not is_shirt(br, bg, bb):
                continue
            dst[dx, dy] = (255, 255, 255, 255)
    return base.convert("RGB")


def smooth_boxes(boxes):
    """Keep the print still. A turned-away frame stays blank."""
    out = []
    for i, box in enumerate(boxes):
        if not box:
            out.append(None)
            continue
        window = [boxes[j] for j in range(max(0, i - 2), min(len(boxes), i + 3)) if boxes[j]]
        if len(window) < 2:
            out.append(box)
            continue
        out.append(tuple(sum(b[k] for b in window) / len(window) for k in range(4)))
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
    names = sorted({p.stem for p in RAW.iterdir() if p.suffix in {".mp4", ".jpg"}})
    if not names:
        sys.exit(f"no clips in {RAW}")
    work = Path("/tmp/shirt-frames")
    OUT.mkdir(parents=True, exist_ok=True)
    for name in names:
        poster = RAW / f"{name}.jpg"
        if poster.exists():
            stamp(Image.open(poster), logo).save(OUT / f"{name}.jpg", quality=90)
            print("poster", name)
        video = RAW / f"{name}.mp4"
        if not video.exists():
            continue
        folder = work / name
        frames_of(video, folder)
        files = sorted(folder.glob("f*.jpg"))
        boxes = smooth_boxes([shirt_box(Image.open(frame)) for frame in files])
        for frame, box in zip(files, boxes):
            stamp(Image.open(frame), logo, box).save(frame, quality=92)
        encode(folder, OUT / f"{name}.mp4")
        print("video", name, len(files))
    print("done", ", ".join(names))


if __name__ == "__main__":
    main()
