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


# Ace curled up asleep, head on the right toward Kevin's sit spot. Built from
# ellipses with a hard ink outline per part, like draw-hunt.mjs. Frames:
# rest, inhale, inhale, rest; a z floats up from his nose across frames 1-3.
Pix = dict

_INK = (34, 18, 18, 255)
_CREAM = (245, 236, 220, 255)
_CREAM_HI = (255, 252, 244, 255)
_CREAM_SH = (214, 200, 178, 255)
_TAN = (198, 142, 74, 255)
_TAN_DK = (150, 96, 48, 255)
_APRICOT = (228, 196, 152, 255)
_APRICOT_DK = (204, 164, 116, 255)
_MUZZLE = (104, 92, 88, 255)
_BLACK = (28, 16, 14, 255)
_BLUE = (62, 118, 186, 255)
_BLUE_DK = (40, 84, 140, 255)
_PINK = (232, 150, 150, 255)
_Z = (196, 226, 244, 255)

ACE_CELL = (44, 38)
ACE_FRAMES = 4


def _ell(layer: Pix, cx: float, cy: float, rx: float, ry: float, c, clip: Optional[Pix] = None) -> None:
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            dx = (x + 0.5 - cx) / rx
            dy = (y + 0.5 - cy) / ry
            if dx * dx + dy * dy <= 1 and (clip is None or (x, y) in clip):
                layer[(x, y)] = c


def _outline(layer: Pix) -> Pix:
    out = dict(layer)
    for x, y in layer:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if (x + dx, y + dy) not in layer:
                out[(x + dx, y + dy)] = _INK
    return out


def _ace_body(lift: int) -> Pix:
    """Body loaf, tan saddle on the back, plume tail curled over the hip. lift=1 is the inhale."""
    body: Pix = {}
    _ell(body, 15, 14 - lift * 0.5, 13, 8 + lift * 0.5, _CREAM_SH)
    _ell(body, 15, 12.5 - lift * 0.5, 12.5, 7 + lift * 0.5, _CREAM)
    for cx, cy in ((10, 9), (17, 8), (21, 12), (13, 13)):
        _ell(body, cx, cy - lift, 1.6, 0.9, _CREAM_SH, clip=body)
    body = _outline(body)
    tail: Pix = {}
    _ell(tail, 6.5, 6.5 - lift, 5, 4.5, _CREAM)
    _ell(tail, 3.5, 3 - lift, 3, 2.5, _CREAM)
    _ell(tail, 2.5, 2 - lift, 1.5, 1, _CREAM_HI)
    _ell(tail, 7.5, 7.5 - lift, 3, 2.5, _CREAM_SH)
    _ell(tail, 8, 7 - lift, 1.5, 1.2, _CREAM)
    tail[(7, 8 - lift)] = _APRICOT_DK
    tail[(8, 8 - lift)] = _APRICOT_DK
    body.update(_outline(tail))
    return body


def _ace_head() -> Pix:
    """Ace: cream Shih Tzu, apricot ears both sides, black nose with a dark goatee, paws under chin."""
    head: Pix = {}
    _ell(head, 30, 14, 7.5, 7, _CREAM)
    _ell(head, 30, 9, 4, 2, _CREAM_HI, clip=head)
    for ex, inner in ((23, 22.5), (37, 37.5)):
        _ell(head, ex, 15, 3, 6, _APRICOT)
        _ell(head, inner, 16, 1.3, 4, _APRICOT_DK)
    for x, y in ((25, 14), (26, 15), (27, 15), (28, 14), (32, 14), (33, 15), (34, 15), (35, 14)):
        head[(x, y)] = _BLACK
    for x, y in ((29, 16), (30, 16), (31, 16), (29, 17), (30, 17), (31, 17)):
        head[(x, y)] = _BLACK
    head[(29, 16)] = (70, 56, 54, 255)
    for x, y in ((30, 18), (29, 19), (30, 19), (31, 19), (29, 20), (30, 20), (31, 20), (30, 21)):
        head[(x, y)] = _MUZZLE
    head = _outline(head)
    for cx in (26.5, 34):
        paw: Pix = {}
        _ell(paw, cx, 22, 3, 1.6, _CREAM)
        paw[(int(cx) - 1, 23)] = _CREAM_SH
        paw[(int(cx) + 1, 23)] = _CREAM_SH
        head.update(_outline(paw))
    return head

def _z(size: int) -> Pix:
    z: Pix = {}
    n = size
    for x in range(n):
        z[(x, 0)] = _Z
        z[(x, n - 1)] = _Z
        z[(n - 1 - x, x)] = _Z
    return z


def ace(dest: Path) -> None:
    cw, ch = ACE_CELL
    im = Image.new("RGBA", (cw * ACE_FRAMES, ch), (0, 0, 0, 0))
    px = im.load()
    head = _ace_head()
    oy = ch - 26
    frames = [
        (_ace_body(0), None),
        (_ace_body(1), (_z(3), 33, oy + 2)),
        (_ace_body(1), (_z(5), 32, oy - 5)),
        (_ace_body(0), (_z(3), 35, oy - 10)),
    ]
    for i, (body, z) in enumerate(frames):
        for layer, ox, dy in ((body, i * cw + 1, oy), (head, i * cw + 1, oy)):
            for (x, y), c in layer.items():
                px[ox + x, dy + y] = c
        if z:
            zg, zx, zy = z
            for (x, y), c in zg.items():
                px[i * cw + zx + x, zy + y] = c
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest)
    print(dest.name, im.size)

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
    ace(OUT / "ace-nap.png")


if __name__ == "__main__":
    main()
