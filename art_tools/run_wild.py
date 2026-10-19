# -*- coding: utf-8 -*-
"""run_wild.py - 82種×ワイルド度3（E1 ふわっと＝外接矩形で散らす／E2・E3＝bodyMain に合わせてはみ出す）の確認シート（2026-10-18）"""
import json, sys
from PIL import Image, ImageDraw
import extras_lib as X, config as C
from art_common import font
sys.stdout.reconfigure(encoding="utf-8")
F = json.loads(C.FACES_JSON.read_text(encoding="utf-8"))["faces"]
E = {i: X.load("E", i) for i in ("E1", "E2", "E3")}
S = 1024
def comp(cid, lv):
    b = X.body(cid).resize((S, S), Image.LANCZOS)
    m = X.mask_of(b); f = F[cid]; k = S / 1000
    if lv == 1:
        bb = X.bbox(b); lay = X.overlay_tile(E["E1"], bb, m, 0.95)
    else:
        bm = [v * k for v in f["bodyMain"]]
        lay = X.overlay_mass(E["E2" if lv == 2 else "E3"], bm, m, 10 if lv == 2 else 20, 1.0)
    return X.with_face(X.stack(b, lay), cid, "normal")
ids = list(F); cell = 150; per = 3
rows = (len(ids) + 3) // 4
s = Image.new("RGB", (4 * (per * cell + 14) + 8, 50 + rows * (cell + 26)), (250, 246, 238))
d = ImageDraw.Draw(s); fo = font(13)
d.text((8, 8), "ワイルド度 1ふわっと・2もこもこ・3もじゃもじゃ（E2・E3は faces.json の bodyMain に合わせる）", font=font(20), fill=(60, 40, 30))
for n, cid in enumerate(ids):
    x0 = 8 + (n % 4) * (per * cell + 14); y0 = 50 + (n // 4) * (cell + 26)
    d.text((x0, y0 + 2), f"{cid} {F[cid]['name'][:9]}", font=fo, fill=(60, 40, 30))
    for lv in (1, 2, 3):
        s.paste(X.cell(comp(cid, lv), cell), (x0 + (lv - 1) * cell, y0 + 22))
    print(cid, flush=True)
s.save("D:/claude/チーズ育成/art/extras/確認_ワイルド度3×82種_20261018.png")
print("END", flush=True)
