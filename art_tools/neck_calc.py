# -*- coding: utf-8 -*-
"""neck_calc.py - くびの品を「口の下」に出す式（アプリも同じ式）と、82種の確認シート（2026-10-18 チーズくん）
式（座標は画像px。体の外接矩形 bbox の左 L・上 T・右 R・下 B、bw=R-L、bh=B-T、顔の幅 fw、口の下端 mb）：
  品の幅      = 0.40 * bw（縦は品の縦横比のまま）
  口の下端 mb = cy + (口のy + max(口のh, 90)) * fw / 1000     … 口のy・hは face_style.json の types[faceType].mouth。表情によらず固定
  品の上端の下限 top = mb + 0.08 * fw
  既定の中心 c0 = T + (neck なら 0.30 / それ以外 0.92) * bh
  中心 c = max(c0, top + 品の高さ/2)
  品の下端 c+高さ/2 が B+0.5*高さ（あごからはみ出してよい上限）を越えるなら、品を s=(B-top)/(0.5*高さ) に縮め、上端を top に置く
  neckScale（既定1.0）は個別値のとき品の大きさに掛ける。s < 0.5 になる種は「外れ」＝ faces.json に neckY（bbox の高さに対する千分率・中心の位置）を個別に書く。neckY があれば式は使わず T + neckY/1000*bh（縮めない）
"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw
sys.path.insert(0, str(Path(__file__).resolve().parent))
import config as C
import extras_lib as X
from art_common import font

STYLE = json.loads(C.FACE_STYLE_JSON.read_text(encoding="utf-8"))
FACES = json.loads(C.FACES_JSON.read_text(encoding="utf-8"))["faces"]
NECK_W = 0.40; GAP = 0.08; MIN_S = 0.5; OVER = 0.5   # OVER＝品が体の下端からはみ出してよい割合（あごに掛かる見た目）


def neck_place(cid, iw, ih, W=2048, H=2048):
    """戻り値：(左x, 上y, 幅, 高さ, 状態)  状態：'式' '縮小' '個別' '外れ'"""
    f = FACES[cid]
    L, T, R, B = [v * (W if i % 2 == 0 else H) / 1000 for i, v in enumerate(f["bbox"])]
    bw, bh = R - L, B - T
    fw = f["w"] * W / 1000
    m = STYLE["types"][f.get("faceType") or "maru"]["mouth"]
    mb = f["cy"] * H / 1000 + (m["y"] + max(m["h"], 90)) * fw / 1000
    w = NECK_W * bw; h = ih * w / iw
    cx = (L + R) / 2
    if f.get("neckY") is not None:
        sc = f.get("neckScale", 1.0)
        w, h = w * sc, h * sc
        c = T + f["neckY"] / 1000 * bh
        return cx - w / 2, c - h / 2, w, h, "個別"
    top = mb + GAP * fw
    c0 = T + (0.30 if f.get("neck") else 0.92) * bh
    c = max(c0, top + h / 2)
    st = "式"
    if c + h / 2 > B + OVER * h:
        s = (B - top) / ((1 - OVER) * h)       # 品の下端が B + OVER*品の高さ に収まる倍率
        if s < MIN_S:
            return cx - w / 2, c - h / 2, w, h, "外れ"
        w, h = w * s, h * s
        c = top + h / 2
        st = "縮小"
    return cx - w / 2, c - h / 2, w, h, st


def render(cid, item, expr="normal"):
    b = X.with_face(X.body(cid), cid, expr)
    it = X.crop(item)
    x, y, w, h, st = neck_place(cid, it.width, it.height)
    it = it.resize((max(1, int(w)), max(1, int(h))), Image.LANCZOS)
    pad = 300
    canvas = Image.new("RGBA", (b.width, b.height + pad), (0, 0, 0, 0))
    canvas.alpha_composite(b, (0, 0))
    canvas.alpha_composite(it, (int(x), int(y)))
    return canvas, st


def sheet(ids, out, title):
    cell = 190
    items = [("F4", X.load("F", "F4")), ("F5", X.load("F", "F5"))]
    cols = 5
    rows = (len(ids) + cols - 1) // cols
    s = Image.new("RGB", (cols * (cell * 2 + 14) + 8, 50 + rows * (cell + 26)), (250, 246, 238))
    d = ImageDraw.Draw(s); f = font(14)
    d.text((8, 8), title, font=font(22), fill=(60, 40, 30))
    stats = {}
    for n, cid in enumerate(ids):
        x0 = 8 + (n % cols) * (cell * 2 + 14); y0 = 50 + (n // cols) * (cell + 26)
        sts = []
        for k, (nm, item) in enumerate(items):
            im, st = render(cid, item); sts.append(st)
            s.paste(X.cell(im, cell), (x0 + k * cell, y0 + 22))
        stats[cid] = sts[0]
        d.text((x0, y0 + 2), f"{cid} {FACES[cid]['name'][:8]} {sts[0]}", font=f, fill=(200, 30, 30) if sts[0] == "外れ" else (60, 40, 30))
    s.save(out)
    return stats
