# -*- coding: utf-8 -*-
"""cut_bg.py - マゼンタ背景（#FF00FF）を外側からつながっている所だけ透過にする＋にじみを数える（検査 #4・#11）

絵の制作計画 v2 §1-1：Gemini の透過出力は未確認なので、背景を単色マゼンタで生成し、ここで抜く。
- 背景の判定：R≥160・B≥160・G≤110・|R−B|≤80（JPEG のむらを許す）。画像の縁から4近傍でつながる背景だけ抜く
  （体の内側に偶然マゼンタっぽい画素があっても抜かない＝穴をあけない。代わりに「内側のにじみ」として数える）
- 縁の2〜3pxは背景色が既知なので、混ざり具合 a を推定して色を戻す（c = a·F + (1−a)·M を F について解く）
- 検査：内側のにじみ（R>200・B>200・G<80 で不透明）の画素数、体の外接矩形の大きさ（画像の60〜80%）と中心のずれ（±5%）
出力：<out>.png（RGBA）と <out>_cut.json（数値）。元画像は変えない

使い方：python cut_bg.py IN.png OUT.png [--band 3] [--leak-max 200]
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

M = np.array([255, 0, 255], dtype=np.float32)


def bg_mask(a):
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    return (r >= 160) & (b >= 160) & (g <= 110) & (np.abs(r - b) <= 80)


def flood_from_border(cand):
    """cand（背景らしい画素）のうち、画像の縁から4近傍でつながる部分"""
    m = np.zeros_like(cand)
    m[0, :], m[-1, :], m[:, 0], m[:, -1] = cand[0, :], cand[-1, :], cand[:, 0], cand[:, -1]
    while True:
        grow = m.copy()
        grow[1:, :] |= m[:-1, :]
        grow[:-1, :] |= m[1:, :]
        grow[:, 1:] |= m[:, :-1]
        grow[:, :-1] |= m[:, 1:]
        grow &= cand
        if (grow == m).all():
            return m
        # 数十回ぶんまとめて進める（速さのため）
        for _ in range(30):
            nxt = grow.copy()
            nxt[1:, :] |= grow[:-1, :]
            nxt[:-1, :] |= grow[1:, :]
            nxt[:, 1:] |= grow[:, :-1]
            nxt[:, :-1] |= grow[:, 1:]
            nxt &= cand
            grow = nxt
        m = grow


def near(mask, n):
    """mask から n px 以内（4近傍）"""
    out = mask.copy()
    for _ in range(n):
        g = out.copy()
        g[1:, :] |= out[:-1, :]
        g[:-1, :] |= out[1:, :]
        g[:, 1:] |= out[:, :-1]
        g[:, :-1] |= out[:, 1:]
        out = g
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--band", type=int, default=3, help="色を戻す縁の幅 px")
    ap.add_argument("--leak-max", type=int, default=200, help="内側のにじみの許容画素数（2K想定）")
    ap.add_argument("--hole-min", type=int, default=400, help="囲まれた背景（輪の内側）として抜く最小の画素数")
    a = ap.parse_args()

    img = np.asarray(Image.open(a.src).convert("RGB")).copy()
    H, W, _ = img.shape
    cand = bg_mask(img)
    bg = flood_from_border(cand)
    # 2026-10-17：ひもの輪の内側など「体に囲まれた背景」も抜く。誤って体に穴をあけないよう、
    # ほぼ純粋なマゼンタ（R≥230・B≥230・G≤40）が --hole-min 画素以上かたまっている所だけ（チーズの色にマゼンタは使わない指示）
    strict = (img[..., 0] >= 230) & (img[..., 2] >= 230) & (img[..., 1] <= 40) & ~bg
    holes = np.zeros_like(bg)
    if strict.sum() >= a.hole_min:
        seed = strict & ~near(~strict, 2)          # 中まで純粋なマゼンタの所を種にして、背景らしい画素へ広げる
        if seed.any():
            m = seed.copy()
            while True:
                g = near(m, 1) & cand & ~bg
                if (g == m).all():
                    break
                m = g
            holes = m if m.sum() >= a.hole_min else holes
    bg = bg | holes
    alpha = np.where(bg, 0, 255).astype(np.float32)

    band = near(bg, a.band) & ~bg
    f = img.astype(np.float32)
    spill = np.clip(np.minimum(f[..., 0], f[..., 2]) - f[..., 1], 0, 255)   # マゼンタの混ざり具合
    al = np.clip(1.0 - spill / 255.0, 0.0, 1.0)
    al_b = al[band]
    safe = np.maximum(al_b, 1e-3)[:, None]
    fg = (f[band] - (1.0 - al_b)[:, None] * M) / safe
    f[band] = np.clip(fg, 0, 255)
    alpha[band] = np.round(al_b * 255)
    alpha[band & (alpha < 16)] = 0

    out = np.dstack([f.round().astype(np.uint8), alpha.astype(np.uint8)])
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(out, "RGBA").save(a.out)

    opaque = out[..., 3] > 0
    r, g, b = out[..., 0].astype(int), out[..., 1].astype(int), out[..., 2].astype(int)
    leak = int((opaque & (r > 200) & (b > 200) & (g < 80)).sum())
    ys, xs = np.nonzero(opaque)
    rep = {"src": str(a.src), "out": str(a.out), "size": [W, H], "bg_pixels": int(bg.sum()),
           "band_pixels": int(band.sum()), "hole_pixels": int(holes.sum()), "inner_magenta_leak": leak, "leak_ok": leak <= a.leak_max}
    if len(xs):
        L, T, R, B = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
        bw, bh = (R - L + 1) * 1000 // W, (B - T + 1) * 1000 // H      # 千分率（整数）
        cx, cy = (L + R) * 500 // W - 500, (T + B) * 500 // H - 500    # 中心のずれ（千分率）
        rep.update({"bbox": [L, T, R, B], "bbox_w_permille": bw, "bbox_h_permille": bh,
                    "center_offset_permille": [cx, cy],
                    "size_ok": 600 <= max(bw, bh) <= 800, "center_ok": abs(cx) <= 50 and abs(cy) <= 50})
    else:
        rep.update({"bbox": None, "size_ok": False, "center_ok": False})
    Path(a.out).with_name(Path(a.out).stem + "_cut.json").write_text(
        json.dumps(rep, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(rep, ensure_ascii=False))


if __name__ == "__main__":
    main()
