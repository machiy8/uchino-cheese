# -*- coding: utf-8 -*-
"""extras_lib.py - 重ね絵・着せ替えを体に重ねる見本と、区分ごとの一覧シート部品（2026-10-17 チーズくん）

重ね方はアプリ（Canvas）でも同じ式にできるよう、体の外接矩形（bw・bh）の割合だけで決めている（ANCHOR）。
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config as C  # noqa: E402
from art_common import font  # noqa: E402

_CK = {}


def checker(w, h, cell=24):
    k = (w, h, cell)
    if k not in _CK:
        yy, xx = np.indices((h, w))
        a = (((xx // cell) + (yy // cell)) % 2).astype(np.uint8)
        arr = np.where(a[..., None] == 1, 236, 255).astype(np.uint8).repeat(3, axis=2)
        _CK[k] = Image.fromarray(arr, "RGB")
    return _CK[k].copy()

import face_preview as FPV  # noqa: E402
from make_sheet_batch import load_body  # noqa: E402

EX = C.ART_ROOT / "extras"
STYLE = FPV.load_style()


def load(cat, i):
    return Image.open(EX / cat / f"{i}.png").convert("RGBA")


def bbox(im, th=60):
    al = np.asarray(im.convert("RGBA"))[..., 3]
    ys, xs = np.nonzero(al > th)
    if len(xs) == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def crop(im):
    return im.crop(bbox(im))


def body(cid, expr=None):
    return load_body(cid, expr, STYLE if expr else None)


def mask_of(im):
    return im.getchannel("A").point(lambda v: 255 if v > 100 else 0)


def clip(layer, mask):
    out = layer.copy()
    out.putalpha(ImageChops.multiply(layer.getchannel("A"), mask))
    return out


def dilate(mask, px):
    return mask.filter(ImageFilter.MaxFilter(px * 2 + 1)).filter(ImageFilter.GaussianBlur(px / 4))


def with_face(img, cid, expr):
    """体（透過）の上に SVG の顔を重ねる（faces.json の位置と型）"""
    f = json.loads(C.FACES_JSON.read_text(encoding="utf-8"))["faces"][cid]
    W, H = img.size
    s = dict(STYLE)
    w = f["w"] * W // 1000
    s["lineWidth"] = max(1, s["lineWidthImagePermille"] * W // w)
    return FPV.draw_face(img, f["cx"] * W // 1000, f["cy"] * H // 1000, w, f.get("tilt") or 0, expr, s,
                         f.get("faceType") or "maru")


# ---- D・E：体の輪郭で切り抜く重ね絵 ----
def overlay_tile(layer, bb, mask, scale=1.0):
    """全面に散らす型（D1・D2・E1）：キャンバス全体を体の外接矩形に合わせて拡大し、体の輪郭で切る"""
    L, T, R, B = bb
    cw, ch = R - L, B - T
    side = int(max(cw, ch) * scale * 1.15)
    lay = layer.resize((side, side), Image.LANCZOS)
    full = Image.new("RGBA", mask.size, (0, 0, 0, 0))
    full.alpha_composite(lay, ((L + R) // 2 - side // 2, (T + B) // 2 - side // 2))
    return clip(full, mask)


def overlay_mass(layer, bb, mask, grow=18, cover=1.0, dy=0.0):
    """かたまりの型（E2・E3）：かたまりの外接矩形を体の外接矩形に合わせ、体の輪郭を grow px だけ広げた範囲で切る（毛が縁からはみ出す）"""
    L, T, R, B = bb
    c = crop(layer)
    bw, bh = (R - L) * cover, (B - T) * cover
    c = c.resize((int(bw * 1.04), int(bh * 1.04)), Image.LANCZOS)
    full = Image.new("RGBA", mask.size, (0, 0, 0, 0))
    full.alpha_composite(c, (int((L + R) / 2 - c.width / 2), int((T + B) / 2 - c.height / 2 + dy * (B - T))))
    return clip(full, dilate(mask, grow))


def stack(base, *layers):
    out = base.copy()
    for l in layers:
        out.alpha_composite(l)
    return out


# ---- F：着せ替えを体に重ねる（体の外接矩形の割合） ----
ANCHOR = {   # kind: (幅/体の幅, 縦の基準, 説明)
    "hat": (0.62, "top"),
    "neck": (0.46, "neck"),
    "mat": (1.30, "mat"),
}
ITEM_KIND = {"F1": "hat", "F2": "hat", "F3": "hat", "F4": "neck", "F5": "neck", "F6": "mat", "F7": "mat", "F8": "mat"}


def dress(base, items, bb, hat_dx=0.0, neck_y=0.80, neck_w=0.40, hat_w=0.62, hat_dy=0.16):
    """base：透過キャンバス上の体（顔つき）。items：['F1','F4','F6'] のようにあたま・くび・しきもの。しきものは体の後ろ。
    neck_y は体の外接矩形の高さに対する割合（顔の下＝口より下に来るよう体ごとに決める）。上下に余白を足したキャンバスを返す"""
    PAD = 400
    W, H = base.size
    L, T, R, B = bb
    T, B = T + PAD, B + PAD
    bw, bh = R - L, B - T
    cx = (L + R) // 2
    big = Image.new("RGBA", (W, H + 2 * PAD), (0, 0, 0, 0))
    big.alpha_composite(base, (0, PAD))
    canvas = Image.new("RGBA", big.size, (0, 0, 0, 0))
    for i in [i for i in items if ITEM_KIND[i] == "mat"]:
        it = crop(load("F", i))
        w = int(bw * ANCHOR["mat"][0])
        it = it.resize((w, int(it.height * w / it.width)), Image.LANCZOS)
        canvas.alpha_composite(it, (cx - w // 2, int(B - it.height * 0.62)))
    canvas.alpha_composite(big)
    for i in items:
        k = ITEM_KIND[i]
        if k == "mat":
            continue
        it = crop(load("F", i))
        w = int(bw * (hat_w if k == "hat" else neck_w))
        it = it.resize((w, int(it.height * w / it.width)), Image.LANCZOS)
        if k == "hat":
            canvas.alpha_composite(it, (int(cx + hat_dx * bw - w // 2), int(T + hat_dy * bh - it.height)))
        else:
            canvas.alpha_composite(it, (cx - w // 2, int(T + neck_y * bh - it.height // 2)))
    return canvas


# ---- シート部品 ----
def cell(img, size, bg="checker"):
    im = img.convert("RGBA")
    c = crop(im) if bg == "checker" and bbox(im) else im
    s = size * 0.9 / max(c.size)
    c = c.resize((max(1, int(c.width * s)), max(1, int(c.height * s))), Image.LANCZOS)
    base = checker(size, size).convert("RGBA") if bg == "checker" else Image.new("RGBA", (size, size), (255, 255, 255, 255))
    base.alpha_composite(c, ((size - c.width) // 2, (size - c.height) // 2))
    return base.convert("RGB")


def sheet(title, rows, cell_px, out, note=None, label_w=0, cols=None):
    """rows：[(行ラベル, [(セルのラベル, PIL画像 or None), ...]), ...]。画像は市松の上に置く"""
    f, fs = font(20), font(15)
    ncol = max(len(r[1]) for r in rows)
    lw = label_w or 0
    W = lw + ncol * (cell_px + 8) + 16
    H = 70 + len(rows) * (cell_px + 34) + (30 if note else 0)
    s = Image.new("RGB", (W, H), (250, 246, 238))
    d = ImageDraw.Draw(s)
    d.text((12, 10), title, font=font(26), fill=(60, 40, 30))
    if note:
        d.text((12, 44), note, font=fs, fill=(110, 90, 80))
    y = 70 + (30 if note else 0) - (30 if note else 0)
    for rl, cells in rows:
        if rl and lw:
            d.text((8, y + cell_px // 2), rl, font=f, fill=(60, 40, 30))
        for k, (lab, im) in enumerate(cells):
            x = lw + 8 + k * (cell_px + 8)
            if im is not None:
                s.paste(cell(im, cell_px), (x, y + 24))
            d.text((x, y + 2), lab, font=fs, fill=(60, 40, 30))
        y += cell_px + 34
    s.save(out)
    return s
