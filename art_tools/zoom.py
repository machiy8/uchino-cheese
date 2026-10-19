# -*- coding: utf-8 -*-
"""zoom.py - 検査用：画像の一部を拡大して横に並べる（キャラ崩れ検査表の「拡大して数える」用）
使い方: python zoom.py OUT.png IMG:L,T,R,B [IMG:L,T,R,B ...]  （各切り抜きを高さ400にそろえて並べる）"""
import sys
from PIL import Image
out, specs = sys.argv[1], sys.argv[2:]
tiles = []
for s in specs:
    path, box = s.rsplit(":", 1)
    L, T, R, B = map(int, box.split(","))
    im = Image.open(path).convert("RGB").crop((L, T, R, B))
    tiles.append(im.resize((int(im.width * 400 / im.height), 400), Image.LANCZOS))
W = sum(t.width for t in tiles) + 10 * (len(tiles) - 1)
sheet = Image.new("RGB", (W, 400), (255, 255, 255))
x = 0
for t in tiles:
    sheet.paste(t, (x, 0)); x += t.width + 10
sheet.save(out)
print(out, sheet.size)
