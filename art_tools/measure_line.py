# -*- coding: utf-8 -*-
"""measure_line.py - 主線の太さと色を測る（検査 #1。ウーパーちゃんで手で測っていた方法を道具にした）

画像の中心を通る縦1列と横1行（--x/--y で位置を変えられる）を走査し、暗い画素（明るさ ≤ --dark）が
続く長さ（＝線の太さ px）と、その画素の平均色を出す。透過PNGは透明な画素を無視する。
--ref-px を付けると、中央値がその ±15% に入るかを判定する（マスターの線の太さと比べる）。

使い方：python measure_line.py IMG.png [--dark 110] [--x 1024] [--y 1024] [--ref-px 14]
"""
import argparse
import json
import sys

from PIL import Image


def lum(p):
    return (p[0] * 299 + p[1] * 587 + p[2] * 114) // 1000


def runs(pixels, dark):
    out, cur, acc = [], 0, []
    for p in pixels + [None]:
        if p is not None and (len(p) < 4 or p[3] > 0) and lum(p) <= dark:
            cur += 1
            acc.append(p)
        elif cur:
            out.append((cur, acc))
            cur, acc = 0, []
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("img")
    ap.add_argument("--dark", type=int, default=110)
    ap.add_argument("--x", type=int)
    ap.add_argument("--y", type=int)
    ap.add_argument("--ref-px", type=int)
    a = ap.parse_args()
    im = Image.open(a.img).convert("RGBA")
    W, H = im.size
    px = im.load()
    x = a.x if a.x is not None else W // 2
    y = a.y if a.y is not None else H // 2
    col = runs([px[x, j] for j in range(H)], a.dark)
    row = runs([px[i, y] for i in range(W)], a.dark)
    allr = col + row
    widths = sorted(n for n, _ in allr)
    pts = [p for _, acc in allr for p in acc]
    mean = [sum(p[i] for p in pts) // len(pts) for i in range(3)] if pts else None
    med = widths[len(widths) // 2] if widths else None
    rep = {"img": a.img, "scan": {"x": x, "y": y}, "runs_px": widths, "median_px": med,
           "line_rgb_mean": mean, "line_hex": ("#%02X%02X%02X" % tuple(mean)) if mean else None}
    if a.ref_px and med is not None:
        lo, hi = a.ref_px * 85 // 100, (a.ref_px * 115 + 99) // 100
        rep.update({"ref_px": a.ref_px, "ok_range": [lo, hi], "ok": lo <= med <= hi})
    print(json.dumps(rep, ensure_ascii=False))


if __name__ == "__main__":
    main()
