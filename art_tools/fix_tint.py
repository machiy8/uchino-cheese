# -*- coding: utf-8 -*-
"""fix_tint.py - 主線で囲まれた1か所の色味だけを寄せる（生成し直さずに直す後処理・2026-10-10 追加）

背景：お腹の変形で、形は合っているのに中が食べ物の色（衣のクリーム色など）になり「透けて見える」ことがある
（10/10 007 えびフライ：しっぽを出す編集で中がクリーム色に戻った）。1コマの作り直し上限に当たったときに使う。

やること：種の点から、主線（暗い茶）で止まる範囲を塗りつぶしで拾い（明るさ > --dark の画素だけ）、
範囲の平均色を --target に寄せる（各画素に (target - 平均) × --strength を足す＝陰影・赤みは残る）。範囲は --box の中に限る。

使い方：
  python fix_tint.py IMG.png --seed X,Y [--seed ...] --box L,T,R,B --target R,G,B [--strength 0.85] [--out 確認用.png]
  - --out を付けると IMG は変えずに結果だけ書く（確認用）
  - 付けないときは元画像を IMG_raw.png に残し（既にあれば上書きしない）、IMG を上書きして retouch.json に追記する
"""
import argparse
import json
import shutil
from collections import deque
from pathlib import Path

from PIL import Image


def lum(p):
    return (p[0] * 299 + p[1] * 587 + p[2] * 114) // 1000


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("img")
    ap.add_argument("--seed", action="append", required=True)
    ap.add_argument("--box", required=True, help="L,T,R,B")
    ap.add_argument("--target", required=True, help="寄せる先の平均色 R,G,B")
    ap.add_argument("--strength", type=float, default=0.85)
    ap.add_argument("--dark", type=int, default=150, help="これ以下の明るさは主線とみなして止まる")
    ap.add_argument("--max", type=int, default=120000)
    ap.add_argument("--out")
    a = ap.parse_args()
    path = Path(a.img)
    im = Image.open(path).convert("RGB")
    px = im.load()
    L, T, R, B = map(int, a.box.split(","))
    region, q = set(), deque()
    for s in a.seed:
        x, y = map(int, s.split(","))
        if lum(px[x, y]) <= a.dark:
            raise SystemExit(f"種 {x},{y} が主線の上です")
        region.add((x, y)); q.append((x, y))
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if (nx, ny) not in region and L <= nx < R and T <= ny < B and lum(px[nx, ny]) > a.dark:
                region.add((nx, ny)); q.append((nx, ny))
        if len(region) > a.max:
            raise SystemExit("範囲が上限を超えました（主線の切れ目から漏れている可能性）。--box を狭める")
    n = len(region)
    mean = [sum(px[p][i] for p in region) / n for i in range(3)]
    tgt = list(map(int, a.target.split(",")))
    d = [(tgt[i] - mean[i]) * a.strength for i in range(3)]
    xs = [p[0] for p in region]; ys = [p[1] for p in region]
    info = {"file": path.name, "tool": "fix_tint.py", "seeds": a.seed, "box": [L, T, R, B], "pixels": n,
            "bbox": [min(xs), min(ys), max(xs), max(ys)], "mean_before": [round(v) for v in mean],
            "target": tgt, "strength": a.strength}
    print(json.dumps(info, ensure_ascii=False))
    out = im.copy()
    op = out.load()
    for p in region:
        op[p] = tuple(max(0, min(255, round(px[p][i] + d[i]))) for i in range(3))
    if a.out:
        out.save(a.out, "PNG")
        return
    raw = path.with_name(path.stem + "_raw.png")
    if not raw.exists():
        shutil.copy2(path, raw)
    out.save(path, "PNG")
    log = path.with_name("retouch.json")
    data = json.loads(log.read_text(encoding="utf-8")) if log.exists() else []
    data.append(info)
    log.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
