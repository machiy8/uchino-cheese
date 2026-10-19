# -*- coding: utf-8 -*-
"""なつき度による熟成短縮の表（相棒仕様 v2 §3 用）
使い方：python -I boost_table.py   → md の表を標準出力へ
計算：短縮後のしきい値（分）＝ 名目（分）×(100−短縮%) // 100（分未満切り捨て・整数演算）
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa
sys.stdout.reconfigure(encoding="utf-8")  # -I では PYTHONIOENCODING が効かないため


def hm(m):
    d, r = divmod(m, 1440)
    h, mi = divmod(r, 60)
    s = ""
    if d:
        s += f"{d}日"
    if h:
        s += f"{h}時間"
    if mi:
        s += f"{mi}分"
    return s or "0分"


def main():
    pcts = sorted(set(BOOST_BY_LV.values()))
    print("| なつき度Lv | 短縮 |")
    print("|---|---|")
    for lv in range(1, 11):
        print(f"| Lv{lv}（累計{LV_TH[lv-1]:,}〜） | {BOOST_BY_LV[lv]}% |")
    print("")
    print("| 段階 | 表示 | 名目（短縮なし） | " + " | ".join(f"{p}%短縮" for p in pcts if p) + " |")
    print("|---|---|---|" + "---|" * len([p for p in pcts if p]))
    for k in TIME_KEYS:
        row = [data.TIME_LABEL[k], f"{TH_MIN[k]:,}分（{hm(TH_MIN[k])}）"]
        for p in pcts:
            if not p:
                continue
            v = short_th(p)[k]
            row.append(f"{v:,}分（{hm(v)}）")
        print(f"| {k} | " + " | ".join(row) + " |")


if __name__ == "__main__":
    main()
