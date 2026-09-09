"""Key magenta, harden alpha, slice grids into game sheets."""

from pathlib import Path
from typing import Optional, Tuple

from PIL import Image

RAW = Path("/Users/kevinlogan7/.cursor/projects/Users-kevinlogan7-code-githubRepositories-ace-naps-loops/assets")
OUT = Path("/Users/kevinlogan7/code/githubRepositories/ace-naps-loops/public/assets/custom")


def _bg(im: Image.Image) -> Tuple[int, int, int]:
    w, h = im.size
    pts = [im.getpixel((2, 2)), im.getpixel((w - 3, 2)), im.getpixel((2, h - 3))]
    return tuple(sum(p[i] for p in pts) // 3 for i in range(3))  # type: ignore[return-value]


def key_rgba(im: Image.Image) -> Image.Image:
    src = im.convert("RGBA")
    br, bg, bb = _bg(src)
    px = src.load()
    w, h = src.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            d2 = (r - br) ** 2 + (g - bg) ** 2 + (b - bb) ** 2
            hot_pink = r > 175 and g < 80 and 80 < b < 210 and r - g > 90
            if d2 < 52 * 52 or hot_pink or a < 200:
                px[x, y] = (0, 0, 0, 0)
            else:
                px[x, y] = (r, g, b, 255)
    return src


def sage_shirt(im: Image.Image) -> Image.Image:
    """Shift khaki/beige shirt pixels toward photo sage green."""
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 255:
                continue
            if 140 <= r <= 230 and 140 <= g <= 230 and 115 <= b <= 200 and abs(r - g) <= 22 and r - b >= 8:
                px[x, y] = (min(255, r * 78 // 100 + 8), min(255, g * 88 // 100 + 28), min(255, b * 82 // 100 + 22), 255)
    return im


def drop_magenta_shadow(im: Image.Image) -> Image.Image:
    """Generated sheets paint a dark-magenta puddle under feet. Do not use on the witch (purple robe)."""
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 255:
                continue
            if r > 90 and g < 50 and b > 50 and b > g + 25 and r - g > 60:
                px[x, y] = (0, 0, 0, 0)
    return im


def scrub_fringe(im: Image.Image) -> Image.Image:
    """Drop near-transparent pixels and leftover key-color clinging to outlines."""
    px = im.load()
    w, h = im.size
    drop = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if a < 255:
                drop.append((x, y))
                continue
            t = 0
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                xx, yy = x + dx, y + dy
                if not (0 <= xx < w and 0 <= yy < h) or px[xx, yy][3] < 200:
                    t += 1
            if t == 0:
                continue
            leftover_pink = r > 50 and g < 40 and b > 20 and r > g + 30
            tan_fringe = t >= 1 and r + g + b > 320 and r > g + 8 and r > 160
            if leftover_pink or tan_fringe:
                drop.append((x, y))
    for x, y in drop:
        px[x, y] = (0, 0, 0, 0)
    return im


def rust_pink_canopy(im: Image.Image) -> Image.Image:
    """Hue-shift magenta/pink foliage to rust. Leaves trunks and orange/gold alone."""
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 255:
                continue
            if r > 100 and g < 90 and b > 28 and r - g > 50 and b > g:
                px[x, y] = (r, min(255, g + 28 + (r - 100) // 8), max(0, b * 35 // 100), 255)
    return im


def paint_back_glasses(im: Image.Image, cols: int, cw: int, ch: int) -> None:
    """Stamp a tiny black rectangle at each ear on sit back-view frames."""
    px = im.load()
    for c in range(cols):
        x0, y0 = c * cw, 0
        xs: list[int] = []
        for y in range(y0 + 13, y0 + 18):
            for x in range(x0 + 4, x0 + cw - 4):
                r, g, b, a = px[x, y]
                if a > 200 and r + g + b > 80:
                    xs.append(x)
        if not xs:
            continue
        left, right, ey = min(xs), max(xs), y0 + 14
        for dx in range(4):
            for dy in range(2):
                px[max(x0, left - 1 + dx), ey + dy] = (8, 6, 6, 255)
                px[min(x0 + cw - 1, right - 2 + dx), ey + dy] = (8, 6, 6, 255)


def harden_pixels(im: Image.Image, step: int = 16) -> Image.Image:
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 255:
                continue
            px[x, y] = (r // step * step, g // step * step, b // step * step, 255)
    return im


def bbox(cell: Image.Image) -> Optional[Tuple[int, int, int, int]]:
    alpha = cell.split()[-1]
    box = alpha.getbbox()
    return box


def fit_cell(cell: Image.Image, tw: int, th: int, scrub: bool = False) -> Image.Image:
    box = bbox(cell)
    out = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    if not box:
        return out
    cropped = cell.crop(box)
    # Leave a 2px pad; keep feet on the floor.
    max_w, max_h = tw - 4, th - 4
    cw, ch = cropped.size
    scale = min(max_w / cw, max_h / ch)
    nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
    resized = cropped.resize((nw, nh), Image.Resampling.NEAREST)
    x = (tw - nw) // 2
    y = th - 2 - nh
    out.paste(resized, (x, y), resized)
    if scrub:
        scrub_fringe(out)
    return out


def sheet(
    src: Path,
    cols: int,
    rows: int,
    cw: int,
    ch: int,
    dest: Path,
    row_order: Optional[list] = None,
    flip_rows: Optional[list] = None,
    shirt_sage: bool = False,
    foot_shadow: bool = False,
    rust_pink: bool = False,
    clean_edges: bool = False,
) -> None:
    keyed = key_rgba(Image.open(src))
    if foot_shadow:
        keyed = drop_magenta_shadow(keyed)
    if rust_pink:
        keyed = rust_pink_canopy(keyed)
    if shirt_sage:
        keyed = sage_shirt(keyed)
    if clean_edges:
        keyed = scrub_fringe(keyed)
    sw, sh = keyed.size
    cell_w, cell_h = sw // cols, sh // rows
    order = row_order or list(range(rows))
    flips = set(flip_rows or [])
    out = Image.new("RGBA", (cols * cw, rows * ch), (0, 0, 0, 0))
    for dest_r, src_r in enumerate(order):
        for c in range(cols):
            cell = keyed.crop((c * cell_w, src_r * cell_h, (c + 1) * cell_w, (src_r + 1) * cell_h))
            fitted = fit_cell(cell, cw, ch, scrub=clean_edges)
            if dest_r in flips:
                fitted = fitted.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            out.paste(fitted, (c * cw, dest_r * ch))
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest)
    print(dest.name, out.size)


def drop_lonely(im: Image.Image) -> Image.Image:
    """Kill 1-neighbor specks that read as a halo when scaled."""
    px = im.load()
    w, h = im.size
    drop = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] < 255:
                continue
            n = 0
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, -1), (-1, 1), (1, 1)):
                xx, yy = x + dx, y + dy
                if 0 <= xx < w and 0 <= yy < h and px[xx, yy][3] == 255:
                    n += 1
            if n <= 1:
                drop.append((x, y))
    for x, y in drop:
        px[x, y] = (0, 0, 0, 0)
    return im


def ace(src: Path, dest: Path, size: int = 48) -> None:
    keyed = key_rgba(Image.open(src))
    box = bbox(keyed)
    if not box:
        raise SystemExit("ace has no opaque pixels")
    out = drop_lonely(scrub_fringe(harden_pixels(fit_cell(keyed.crop(box), size, size, scrub=True))))
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest)
    print(dest.name, out.size)


def main() -> None:
    # v3 walk is already up / left / down / right.
    sheet(
        RAW / "kevin-walk-sheet-v3.png",
        4,
        4,
        64,
        64,
        OUT / "kevin-walk.png",
        shirt_sage=True,
        foot_shadow=True,
        clean_edges=True,
    )
    # v2 sit: row 1 is mixed; use right row for both sides and flip dest left.
    sheet(
        RAW / "kevin-sit-sheet-v2.png",
        3,
        4,
        64,
        64,
        OUT / "kevin-sit.png",
        row_order=[0, 3, 2, 3],
        flip_rows=[1],
        shirt_sage=True,
        foot_shadow=True,
        clean_edges=True,
    )
    # Front sit last frame has a smashed lens; reuse the clean front frame.
    sit = Image.open(OUT / "kevin-sit.png")
    sit.paste(sit.crop((0, 128, 64, 192)), (128, 128))
    paint_back_glasses(sit, 3, 64, 64)
    sit.save(OUT / "kevin-sit.png")
    sheet(RAW / "witch-walk-sheet.png", 4, 4, 64, 64, OUT / "witch-walk.png")
    sheet(RAW / "trees-chunky-v2.png", 2, 2, 128, 144, OUT / "trees.png", rust_pink=True)
    sheet(RAW / "leaves-chunky.png", 4, 1, 16, 16, OUT / "leaves.png")
    ace(RAW / "ace-pixel-v2.png", OUT / "ace-nap.png", 48)


if __name__ == "__main__":
    main()
