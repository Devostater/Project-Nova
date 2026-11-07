"""Build game-ready VFX textures from the Gemini source images in art_src/gemini/.

Sources (made with gemini-3.1-flash-image, prompts in ASSET_BACKLOG.md): fireball, smoke,
sparks, laser, muzzle, engine, warp. All are on pure black; the game draws them additively.

Run from the repo root:  python3 tools/vfx_build.py
Writes each texture to public/fx/ and fx/ (the PC servers serve the repo root). Requires Pillow.

Animated sheets are built here rather than generated, so every frame lines up exactly:
frame 0 is top-left, frames run left to right then top to bottom, and the last frames are black.
"""
import math
import os
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

SRC = os.path.join('art_src', 'gemini')
OUTS = [os.path.join('public', 'fx'), 'fx']


def load(name):
    return Image.open(os.path.join(SRC, name + '.jpg')).convert('RGB')


def crush(img, black=20):
    """Push near-black (JPEG noise) to pure black so additive blending shows no haze."""
    return img.point(lambda v: 0 if v <= black else round((v - black) * 255 / (255 - black)))


def vignette(img, frac=0.10):
    """Fade the outer edge to black so nothing is cut off at a frame border."""
    w, h = img.size
    m = Image.new('L', (w, h), 0)
    pad = max(2, int(min(w, h) * frac))
    ImageDraw.Draw(m).ellipse([pad // 2, pad // 2, w - 1 - pad // 2, h - 1 - pad // 2], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(pad))
    return ImageChops.multiply(img, Image.merge('RGB', (m, m, m)))


def gray(img):
    """Luminance only: the game tints these textures per use (cyan player, red enemy, orange boom)."""
    return img.convert('L').convert('RGB')


def save(img, name, mode=None, quality=None):
    for d in OUTS:
        os.makedirs(d, exist_ok=True)
        out = img.convert(mode) if mode else img
        path = os.path.join(d, name)
        if name.endswith('.jpg'):
            out.save(path, quality=quality or 90, optimize=True)
        else:
            out.save(path, optimize=True)
    print('wrote', name, img.size)


def ease_out(x):
    return 1 - (1 - min(1.0, max(0.0, x))) ** 3


def place(canvas, sprite, scale, alpha, angle=0.0):
    """Additively paste `sprite` centred on `canvas`, scaled and faded."""
    if alpha <= 0.002 or scale <= 0.01:
        return
    cw, ch = canvas.size
    s = max(2, int(cw * scale))
    sp = sprite.resize((s, s), Image.LANCZOS)
    if angle:
        sp = sp.rotate(angle, resample=Image.BICUBIC)
    sp = ImageEnhance.Brightness(sp).enhance(alpha)
    layer = Image.new('RGB', canvas.size, 0)
    layer.paste(sp, ((cw - s) // 2, (ch - s) // 2))
    canvas.paste(ImageChops.add(canvas, layer))


def cool(img, t):
    """Shift a fireball from white-yellow toward deep red as it cools (t 0..1)."""
    r, g, b = img.split()
    g = g.point(lambda v: v * (1 - 0.55 * t))
    b = b.point(lambda v: v * (1 - 0.85 * t))
    return Image.merge('RGB', (r, g, b))


def sheet(frames, cols, rows, cell):
    out = Image.new('RGB', (cols * cell, rows * cell), 0)
    for i, f in enumerate(frames[:cols * rows]):
        out.paste(f, ((i % cols) * cell, (i // cols) * cell))
    return out


def build_explosion():
    """8x8 at 256 px. The game plays frames 0-55 over the billboard's life."""
    fire = vignette(crush(load('fireball')), 0.08)
    smoke = vignette(crush(load('smoke'), 12), 0.08)
    cell, n_used = 256, 56
    frames = []
    for i in range(64):
        t = i / (n_used - 1) if i < n_used else 1.0
        f = Image.new('RGB', (cell, cell), 0)
        if i < n_used:
            # fireball: fast swell, holds, then cools and fades by ~75%
            fs = 0.30 + 0.62 * ease_out(t / 0.30) + 0.10 * t
            fa = 1.0 if t < 0.28 else max(0.0, 1 - (t - 0.28) / 0.47)
            place(f, cool(fire, min(1, t / 0.7)), fs, fa, angle=t * 25)
            # smoke: rises in as the fire cools, drifts outward, gone by the end
            sa = 0.0 if t < 0.25 else (min(1, (t - 0.25) / 0.25) * max(0.0, 1 - (t - 0.55) / 0.45) if t > 0.55 else min(1, (t - 0.25) / 0.25))
            place(f, smoke, 0.80 + 0.30 * t, 0.85 * sa, angle=-t * 15)
        frames.append(f)
    save(sheet(frames, 8, 8, cell), 'vfx_explosion_8x8.jpg', quality=88)


def build_burst(src, name, cols, cell, grow=(0.35, 1.0)):
    """Small one-shot burst sheets: scale up and fade out."""
    img = vignette(crush(load(src)), 0.08)
    n = cols * cols
    frames = []
    for i in range(n):
        t = i / (n - 1)
        f = Image.new('RGB', (cell, cell), 0)
        place(f, img, grow[0] + (grow[1] - grow[0]) * ease_out(t), (1 - t) ** 1.5, angle=t * 20)
        frames.append(f)
    save(sheet(frames, cols, cols, cell), name)


def build_laser():
    """Vertical bolt, head at the bottom of the texture (= -Z, forward, on the fins)."""
    img = crush(load('laser'))
    bbox = gray(img).getbbox()
    if bbox:
        x0, y0, x1, y1 = bbox
        cy, h = (y0 + y1) // 2, max(40, int((y1 - y0) * 1.6))
        img = img.crop((max(0, x0 - 10), max(0, cy - h // 2), min(img.width, x1 + 10), min(img.height, cy + h // 2)))
    img = gray(img).rotate(90, expand=True).resize((128, 512), Image.LANCZOS)
    save(vignette(img, 0.06), 'vfx_laser.png', mode='L')


def build_single(src, name, size, grayscale=True, frac=0.08):
    img = vignette(crush(load(src)), frac).resize((size, size), Image.LANCZOS)
    if grayscale:
        save(gray(img), name, mode='L')
    else:
        save(img, name)


def main():
    build_explosion()                                            # replaces the catalog-cut atlas
    build_laser()                                                # replaces catalog-cut bolt
    build_single('muzzle', 'vfx_flare.png', 256)                 # generic flare / tip / core flash
    build_single('sparks', 'vfx_spark.png', 256)                 # arcs and shield-break bursts
    build_burst('sparks', 'vfx_explosion_small_4x4.png', 4, 128)  # for bullet hits (not wired yet)
    build_burst('muzzle', 'vfx_muzzle_4x4.png', 4, 128, (0.5, 1.0))  # not wired yet
    build_single('engine', 'vfx_engine_glow.png', 256, grayscale=False)  # not wired yet
    build_single('warp', 'vfx_warp_streaks.png', 1024, frac=0.0)  # not wired yet


if __name__ == '__main__':
    main()
