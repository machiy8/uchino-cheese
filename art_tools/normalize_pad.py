# -*- coding: utf-8 -*-
"""normalize_pad.py - 透過にした体の「余白」をそろえて書き出す（2026-10-17 チーズくん・d了承）

第1便で外接矩形の長い辺が 73.5%〜87.1% とばらついた（指示文は70%前後）。図鑑の一覧で大きさがそろうように、
書き出し時に次の規則で整える（画像の大きさ 2048px は変えない）：
- 外接矩形の中心を画像の中心に移す
- 長い辺が LO（740‰）未満なら LO まで拡大、HI（800‰）を超えるなら HI まで縮小。その間はそのまま
  （拡大・縮小は主線の太さも変えるので、幅を狭くとって線の変化を ±8% 程度に抑える）
- 拡大縮小は LANCZOS（透過の縁は premultiplied で扱う）
元の切り抜き（そろえる前）は <ZUKAN_DIR>/cut/<id>.png に残す。主線の検査はそろえる前の画像で行う（生成の良し悪しを見るため）

使い方：python normalize_pad.py IN.png OUT.png [--lo 740 --hi 800]   → 最後の行に json（scale_permille 等）
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

LO, HI = 740, 800


def normalize(im, lo=LO, hi=HI):
    im = im.convert("RGBA")
    W, H = im.size
    a = np.asarray(im)[..., 3]
    ys, xs = np.nonzero(a > 0)
    L, T, R, B = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    crop = im.crop((L, T, R, B))
    cw, ch = crop.size
    long_pm = max(cw * 1000 // W, ch * 1000 // H)
    target = min(max(long_pm, lo), hi)
    scale_pm = target * 1000 // long_pm if long_pm else 1000
    if scale_pm != 1000:
        nw, nh = max(1, cw * scale_pm // 1000), max(1, ch * scale_pm // 1000)
        pre = crop.convert("RGBa")                      # premultiplied で縮めて縁の色を濁らせない
        crop = pre.resize((nw, nh), Image.LANCZOS).convert("RGBA")
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.alpha_composite(crop, ((W - crop.size[0]) // 2, (H - crop.size[1]) // 2))
    info = {"before_long_permille": long_pm, "after_long_permille": target, "scale_permille": scale_pm,
            "bbox_before": [L, T, R, B], "size_after": list(crop.size)}
    return out, info


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--lo", type=int, default=LO)
    ap.add_argument("--hi", type=int, default=HI)
    a = ap.parse_args()
    out, info = normalize(Image.open(a.src), a.lo, a.hi)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    out.save(a.out)
    print(json.dumps(info, ensure_ascii=False))


if __name__ == "__main__":
    main()
