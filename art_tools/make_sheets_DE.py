# -*- coding: utf-8 -*-
"""make_sheets_DE.py - 区分 D（段階の重ね絵）・E（ワイルド度）の一覧：単体＋体に重ねた見本（r01・r36 ゴーダ・r58 スカモルツァ）"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import extras_lib as X
from PIL import Image

OUT = X.EX
BODIES = [("r01 クリームチーズ", "r01", "smile"), ("r36 ゴーダ", "r36", "normal"), ("r58 スカモルツァ", "r58", "normal")]


def comp(cid, expr, *layers_fn):
    b = X.body(cid)
    bb = X.bbox(b)
    m = X.mask_of(b)
    layers = [fn(bb, m) for fn in layers_fn]
    s = X.stack(b, *layers)
    return X.with_face(s, cid, expr)


D1, D2 = X.load("D", "D1"), X.load("D", "D2")
E = {i: X.load("E", i) for i in ("E1", "E2", "E3")}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    rows = [("単体", [("D1 産毛", D1), ("D2 ひび", D2)])]
    for nm, cid, ex in BODIES:
        rows.append((nm, [
            ("ふだん", comp(cid, ex)),
            ("うまれたて（産毛）", comp(cid, ex, lambda bb, m: X.overlay_tile(D1, bb, m))),
            ("ヴィンテージ（ひび）", comp(cid, ex, lambda bb, m: X.overlay_tile(D2, bb, m, 1.0))),
        ]))
    X.sheet("区分D 段階の重ね絵（うまれたての産毛・ヴィンテージのひび）", rows, 360, OUT / "一覧_D_段階の重ね絵_20261017.png", label_w=0)
    rows = [("単体", [("E1 ふわっと", E["E1"]), ("E2 もこもこ", E["E2"]), ("E3 もじゃもじゃ", E["E3"])])]
    for nm, cid, ex in BODIES:
        rows.append((nm, [
            ("0 ふだん", comp(cid, ex)),
            ("1 ふわっと", comp(cid, ex, lambda bb, m: X.overlay_tile(E["E1"], bb, m, 0.95))),
            ("2 もこもこ", comp(cid, ex, lambda bb, m: X.overlay_mass(E["E2"], bb, m, 20, 1.0))),
            ("3 もじゃもじゃ", comp(cid, ex, lambda bb, m: X.overlay_mass(E["E3"], bb, m, 40, 1.0))),
        ]))
    X.sheet("区分E ワイルド度（体の輪郭に沿わせて切り抜いた見本）", rows, 330, OUT / "一覧_E_ワイルド度_20261017.png")


main()
