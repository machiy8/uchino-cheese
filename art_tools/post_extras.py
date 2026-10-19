# -*- coding: utf-8 -*-
"""post_extras.py - gen_extras.py の出力の後処理（2026-10-17 チーズくん）

key_magenta(im)：マゼンタ背景を「どこにあっても」透過にする（外側につながっていなくてもよい＝すき間のある重ね絵・リボンの輪用）。
  半透明の縁は混ざり具合を推定して色を戻す。内側に残ったマゼンタっぽい画素の数も数える（検査 #4 に相当）
white_to_alpha(im)：白背景の線画（ひび模様）を、暗さ→不透明度にして線の色で塗る
fit_square(im, size)：透過画像を外接矩形で切って、余白つきで size 角に収める
使い方：python post_extras.py CAT ID...  → extras/CAT/<id>.png（透過・元の大きさ）と extras/CAT/<id>_post.json
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config as C  # noqa: E402

M = np.array([255, 0, 255], dtype=np.float32)
EXTRAS = C.ART_ROOT / "extras"


def key_magenta(im):
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = np.minimum(r, b) - g                        # マゼンタらしさ（純マゼンタ=255）
    bgf = np.clip((m - 60.0) / 150.0, 0, 1)         # 背景の割合（JPEGのむらで m≧210 なら完全に背景）
    bgf[(np.abs(r - b) > 90)] = 0                   # 赤や青そのものは背景にしない
    fg = 1.0 - bgf
    out = np.zeros(a.shape[:2] + (4,), np.float32)
    with np.errstate(divide="ignore", invalid="ignore"):
        col = (a - bgf[..., None] * M) / np.maximum(fg[..., None], 1e-3)
    out[..., :3] = np.clip(np.where(fg[..., None] > 0.02, col, a), 0, 255)
    out[..., 3] = fg * 255
    out[..., 3][fg < 0.04] = 0
    out[..., 3][fg > 0.96] = 255
    # 実体（不透明）から 8px より遠い所の薄い画素（JPEGのもや）は消す
    from PIL import ImageFilter
    solid = Image.fromarray(((out[..., 3] > 128) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(17))
    out[..., 3][np.asarray(solid) == 0] = 0
    res = Image.fromarray(out.astype(np.uint8), "RGBA")
    # 内側に残ったマゼンタっぽい不透明画素
    al = np.asarray(res)[..., 3]
    leak = int(((r > 200) & (b > 200) & (g < 80) & (al > 200)).sum())
    return res, leak


def white_to_alpha(im, line=(0x6B, 0x4A, 0x32), gain=1.0):
    lum = np.asarray(im.convert("L")).astype(np.float32)
    al = np.clip((235.0 - lum) / 150.0 * gain, 0, 1) * 255
    out = np.zeros(lum.shape + (4,), np.uint8)
    out[..., 0], out[..., 1], out[..., 2] = line
    out[..., 3] = al.astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def bbox(im):
    al = np.asarray(im.convert("RGBA"))[..., 3]
    ys, xs = np.nonzero(al > 60)
    if len(xs) == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def fit_square(im, size, pad=0.06):
    bb = bbox(im)
    if not bb:
        return Image.new("RGBA", (size, size))
    c = im.crop(bb)
    s = size * (1 - 2 * pad) / max(c.size)
    c = c.resize((max(1, round(c.width * s)), max(1, round(c.height * s))), Image.LANCZOS)
    o = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    o.alpha_composite(c, ((size - c.width) // 2, (size - c.height) // 2))
    return o


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    cat, ids = sys.argv[1], sys.argv[2:]
    for i in ids:
        src = EXTRAS / cat / "raw" / f"{i}.png"
        im = Image.open(src)
        if i in ("D1", "D2"):
            res, leak = white_to_alpha(im, (0xC9, 0xA7, 0x7C) if i == "D1" else (0x6B, 0x4A, 0x32), 2.4 if i == "D1" else 1.0), 0
        else:
            res, leak = key_magenta(im)
        bb = bbox(res)
        W, H = res.size
        info = {"id": i, "size": [W, H], "bbox": bb, "leak": leak,
                "bbox_w_pct": round((bb[2] - bb[0]) * 100 / W, 1) if bb else 0,
                "bbox_h_pct": round((bb[3] - bb[1]) * 100 / H, 1) if bb else 0}
        res.save(EXTRAS / cat / f"{i}.png")
        (EXTRAS / cat / f"{i}_post.json").write_text(json.dumps(info, ensure_ascii=False), encoding="utf-8")
        print(info)


if __name__ == "__main__":
    main()
