# -*- coding: utf-8 -*-
"""make_sheets_GM.py - 区分 G（熟成庫の背景3）・M（記念の背景1）の一覧。相棒（r01）を重ねた見本つき"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from PIL import Image, ImageDraw
import extras_lib as X
import config as C
from art_common import font


def put(bg, body, cx, bottom, width):
    c = X.crop(body)
    c = c.resize((width, int(c.height * width / c.width)), Image.LANCZOS)
    out = bg.convert("RGBA")
    out.alpha_composite(c, (int(cx - width / 2), int(bottom - c.height)))
    return out.convert("RGB")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    r01 = X.with_face(X.body("r01"), "r01", "smile")
    r01n = X.with_face(X.body("r01"), "r01", "normal")
    vint = Image.open(C.ART_ROOT / "vintage" / "r01_v_smile.png").convert("RGBA")
    H = 900
    cells = []
    for gid, nm in (("G1", "石の熟成庫"), ("G2", "木の山小屋"), ("G3", "窓辺のキッチン")):
        bg = Image.open(X.EX / "G" / "raw" / f"{gid}.png").convert("RGB")
        w = bg.width
        full = put(bg, r01n, w * 0.5, bg.height * 0.80, int(w * 0.46))
        cells.append((f"{gid} {nm}（背景のみ／相棒を置いた見本）", bg, full))
    m = Image.open(X.EX / "M" / "raw" / "M1.png").convert("RGB")
    mf = put(m, vint, m.width * 0.5, m.height * 0.86, int(m.width * 0.50))
    f, fs = font(26), font(17)
    colw = int(H * 1536 / 2752)
    W = 12 + 3 * (colw * 2 + 14) + 12
    s = Image.new("RGB", (W + 0, 70 + H + 40 + 560 + 60), (250, 246, 238))
    d = ImageDraw.Draw(s)
    d.text((12, 10), "区分G 熟成庫の背景3（9:16・不透明）／区分M 記念の背景1", font=f, fill=(60, 40, 30))
    x = 12
    for lab, bg, full in cells:
        d.text((x, 44), lab, font=fs, fill=(60, 40, 30))
        s.paste(bg.resize((colw, H)), (x, 70))
        s.paste(full.resize((colw, H)), (x + colw + 6, 70))
        x += colw * 2 + 14
    y = 70 + H + 14
    d.text((12, y), "M1 記念の背景（背景のみ／最終段階の特別版 r01_v_smile を重ねた見本。名前と日数はCanvasで後から）", font=fs, fill=(60, 40, 30))
    s.paste(m.resize((560, 560)), (12, y + 26))
    s.paste(mf.resize((560, 560)), (12 + 566, y + 26))
    s.save(X.EX / "一覧_G_M_背景_20261017.png")


main()
