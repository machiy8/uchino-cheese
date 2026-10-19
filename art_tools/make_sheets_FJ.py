# -*- coding: utf-8 -*-
"""make_sheets_FJ.py - 区分 F（着せ替え）・J（UI飾り）の一覧。着せ替えは体に重ねた見本（r01・r36 ゴーダ・r58 スカモルツァ）つき"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import extras_lib as X

BODIES = [("r01 クリームチーズ（四角）", "r01", "smile", 0.90, 0.62, 0.14), ("r36 ゴーダ（円盤）", "r36", "normal", 0.93, 0.62, 0.14), ("r58 スカモルツァ（ひょうたん）", "r58", "normal", 0.30, 0.40, 0.13)]
COMBOS = [(["F1", "F4", "F6"], "葉っぱ帽子＋リボン＋わら"), (["F2", "F5", "F7"], "シェフ帽＋スカーフ＋まな板"), (["F3", "F4", "F8"], "ベレー帽＋リボン＋クロス")]
NAMES = {"F1": "F1 葉っぱの帽子", "F2": "F2 シェフ帽", "F3": "F3 ベレー帽", "F4": "F4 リボン", "F5": "F5 スカーフ",
         "F6": "F6 わらのマット", "F7": "F7 木のまな板", "F8": "F8 ギンガムのクロス"}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    rows = [("あたま", [(NAMES[i], X.load("F", i)) for i in ("F1", "F2", "F3")]),
            ("くび", [(NAMES[i], X.load("F", i)) for i in ("F4", "F5")]),
            ("しきもの", [(NAMES[i], X.load("F", i)) for i in ("F6", "F7", "F8")])]
    for nm, cid, ex, ny, hw, hd in BODIES:
        b = X.body(cid)
        bb = X.bbox(b)
        base = X.with_face(b, cid, ex)
        rows.append((nm, [(lab, X.dress(base, items, bb, neck_y=ny, hat_w=hw, hat_dy=hd)) for items, lab in COMBOS]))
    X.sheet("区分F 着せ替え8点（上＝単体、下＝体に重ねた見本：体型の違う3種）", rows, 380, X.EX / "一覧_F_着せ替え_20261017.png")
    rows = [("", [(f"J{k} " + n, X.load("J", f"J{k}")) for k, n in ((1, "熟成棚の棚"), (2, "図鑑の台紙"))]),
            ("", [(f"J{k} " + n, X.load("J", f"J{k}")) for k, n in ((3, "飾り棚"), (4, "吹き出しの枠"))])]
    X.sheet("区分J UI飾り4点（透過・市松の上）", rows, 440, X.EX / "一覧_J_UI飾り_20261017.png")


main()
