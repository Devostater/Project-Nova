"""Cut clean, game-ready VFX textures out of the reference sheets in public/VFX/.

The source sheets are catalog images (titles, ROW/COL labels, grid lines), so the game
can't map them directly. This script crops the cells the game uses, fades every crop to
black at the edges (removing grid lines; the game draws these additively, so black is
invisible) and writes power-of-two PNGs to public/fx/ following ASSET_SPEC.md.

Run from the repo root:  python3 tools/vfx_cut.py
Requires Pillow (pip install pillow). Re-run whenever the source sheets change.
"""
import os
from PIL import Image, ImageChops, ImageDraw, ImageFilter

SRC = os.path.join('public', 'VFX')
OUT = os.path.join('public', 'fx')


def load(name):
    return Image.open(os.path.join(SRC, name)).convert('RGB')


def feather(img, frac=0.12):
    """Fade the outer `frac` of each side to black."""
    w, h = img.size
    m = Image.new('L', (w, h), 0)
    pad = max(2, int(min(w, h) * frac))
    ImageDraw.Draw(m).rectangle([pad, pad, w - 1 - pad, h - 1 - pad], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(pad / 2))
    return ImageChops.multiply(img, Image.merge('RGB', (m, m, m)))


def crush(img, black=28):
    """Push near-black (faint grid marks, JPEG noise) to pure black."""
    return img.point(lambda v: 0 if v <= black else round((v - black) * 255 / (255 - black)))


def fit(img, size):
    """Scale to fit inside `size` (w, h), centered on black."""
    tw, th = size
    k = min(tw / img.width, th / img.height)
    im = img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)
    out = Image.new('RGB', size, 0)
    out.paste(im, ((tw - im.width) // 2, (th - im.height) // 2))
    return out


def cell(img, x0, y0, x1, y1, inset=3):
    return img.crop((x0 + inset, y0 + inset, x1 - inset, y1 - inset))


def save(img, name):
    img = crush(img)
    img.save(os.path.join(OUT, name), optimize=True)
    print('wrote', name, img.size)


def main():
    os.makedirs(OUT, exist_ok=True)

    # Explosion: 10x6 grid, 56 usable frames -> clean 8x8 atlas (1024 px, 128 px cells).
    ex = load('explosion VFX1.jpg')
    cw, ch = ex.width / 10, ex.height / 6
    atlas = Image.new('RGB', (1024, 1024), 0)
    for i in range(56):
        c, r = i % 10, i // 10
        f = cell(ex, round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch))
        f = feather(fit(f, (128, 128)), 0.08)
        atlas.paste(f, ((i % 8) * 128, (i // 8) * 128))
    save(atlas, 'vfx_explosion_8x8.png')

    # Laser: row 7 (white bolt, tinted in game). Rotated so the head points down the
    # texture, which maps to -Z (forward) on the bolt fins.
    la = load('lasers.jpg')
    rh = la.height / 8
    bolt = cell(la, 20, round(6 * rh), 1000, round(7 * rh), inset=2)
    save(feather(fit(bolt.rotate(90, expand=True), (128, 512)), 0.06), 'vfx_laser.png')

    # Glows sheet: 4x3 grid between x 45..1001, y 49..559.
    gl = load('glows and flares.jpg')
    gx, gy, gw, gh = 45, 49, (1001 - 45) / 4, (559 - 49) / 3
    g = lambda c, r: cell(gl, round(gx + c * gw), round(gy + r * gh), round(gx + (c + 1) * gw), round(gy + (r + 1) * gh), inset=4)
    save(feather(fit(g(2, 0), (256, 256)), 0.10), 'vfx_flare.png')   # white 4-point star
    save(feather(fit(g(3, 1), (256, 256)), 0.10), 'vfx_spark.png')   # blue electric burst

    # Shield: hex cell (row 1, col 1) of the 8x8 grid between x 77..998, y 76..572.
    sh = load('energy shields.jpg')
    sw, shh = (998 - 77) / 8, (572 - 76) / 8
    hexc = cell(sh, 77, 76, round(77 + sw), round(76 + shh), inset=3)
    save(feather(fit(hexc, (128, 128)), 0.10), 'vfx_shield.png')

    # Lightning: row 1 (blue) of 8 rows between y 30..568, x 67..1016, turned to run
    # along the texture's V axis, which is the length of beams.
    li = load('lightning.jpg')
    lh = (568 - 30) / 8
    strip = cell(li, 67, 30, 1016, round(30 + lh), inset=3)
    save(feather(fit(strip.rotate(90, expand=True), (128, 512)), 0.04), 'vfx_lightning.png')


if __name__ == '__main__':
    main()
