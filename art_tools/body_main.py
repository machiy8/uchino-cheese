# -*- coding: utf-8 -*-
"""body_main.py - 82種の体の外接矩形(bbox)・体の太い部分の矩形(bodyMain)・首のある体の印(neck)を求める（2026-10-18 チーズくん）
単位は faces.json と同じ千分率（画像の幅・高さに対する）。算法（アプリで再計算する必要はなく faces.json の値を使う）：
 1) alpha>100 の画素の外接矩形 = bbox
 2) 行ごとの横幅 w(y)（その行の一番左〜一番右）。最大幅 Wmax
 3) 幅が 0.80*Wmax 以上の行のうち、最大幅の行を含む連続した帯 = 太い部分。bodyMain は帯の高さ×帯の横の広がり
 4) neck：bbox の高さ 12%〜88% の間に、上の最大幅と下の最大幅の小さい方の 0.72 倍より細い行があれば true（くびれ）
個別の手直しは faces.json 側に bodyMain を直接書く（このスクリプトは bodyMainAuto として自動値も残す）
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parent))
import config as C

def analyze(cid):
    a = np.asarray(Image.open(C.ZUKAN_DIR / f"{cid}.png").convert("RGBA"))[..., 3] > 100
    H, W = a.shape
    ys, xs = np.nonzero(a)
    L, T, R, B = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    rows = np.zeros(H, int); lo = np.zeros(H, int); hi = np.zeros(H, int)
    for y in range(T, B):
        r = np.nonzero(a[y])[0]
        if len(r):
            lo[y], hi[y] = r.min(), r.max() + 1; rows[y] = hi[y] - lo[y]
    wmax = rows.max(); ymax = int(np.argmax(rows))
    y0 = y1 = ymax
    while y0 - 1 >= T and rows[y0 - 1] >= 0.80 * wmax: y0 -= 1
    while y1 + 1 < B and rows[y1 + 1] >= 0.80 * wmax: y1 += 1
    mL, mR = lo[y0:y1 + 1].min(), hi[y0:y1 + 1].max()
    bh = B - T
    neck = False
    for y in range(int(T + 0.12 * bh), int(T + 0.88 * bh)):
        up = rows[T:y].max(); dn = rows[y + 1:B].max()
        if rows[y] < 0.72 * min(up, dn): neck = True; break
    pm = lambda v, s: int(round(v * 1000 / s))
    return dict(bbox=[pm(L, W), pm(T, H), pm(R, W), pm(B, H)], bodyMainAuto=[pm(mL, W), pm(y0, H), pm(mR, W), pm(y1 + 1, H)], neckAuto=bool(neck))

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    p = C.FACES_JSON
    d = json.loads(p.read_text(encoding="utf-8"))
    for cid in d["faces"]:
        r = analyze(cid)
        f = d["faces"][cid]
        f["bbox"] = r["bbox"]; f["bodyMainAuto"] = r["bodyMainAuto"]; f["neckAuto"] = r["neckAuto"]
        f.setdefault("bodyMain", r["bodyMainAuto"]); f.setdefault("neck", r["neckAuto"])
        print(cid, f["name"], r)
    p.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
