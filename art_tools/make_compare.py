# -*- coding: utf-8 -*-
"""make_compare.py - マスター候補の比較シート（組ごとに横1行：相棒・白カビ・ホイール）。社内でオーナーが選ぶ資料

元：D:/claude/ウーパーちゃん/work/tools/make_compare.py。面と保存先をチーズ用にした。
--with-face を付けると、相棒（buddy）の右に「SVGの顔を重ねた見本」（face_preview.py の出力 buddy_face.png）を並べる。

使い方：python make_compare.py --out D:/claude/チーズ育成/art/master_candidates/比較_YYYYMMDD.png --verdict 1=合格 2=不合格:顔が出た
"""
import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config as C  # noqa: E402
from art_common import font  # noqa: E402

STYLE = {"1": "ゆるい細線・やさしい平塗り", "2": "絵本の水彩", "3": "太めの輪郭・シール風",
         "4": "ふんわり厚塗り（輪郭うすめ）", "5": "色鉛筆の線・落ち着いた色"}
VIEWS = [("buddy", "相棒（クリームチーズ）"), ("soft", "白カビ"), ("wheel", "大きなホイール")]
CELL, PAD, LABEL_W, HEAD_H = 480, 24, 300, 110


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--groups", nargs="+", default=["1", "2", "3", "4", "5"])
    ap.add_argument("--verdict", nargs="*", default=[])
    ap.add_argument("--with-face", action="store_true")
    ap.add_argument("--title", default="うちのチーズ マスター候補（社内比較用・顔なしで生成）")
    a = ap.parse_args()
    verdict = dict(v.split("=", 1) for v in a.verdict)
    views = VIEWS[:1] + ([("buddy_face", "相棒＋SVGの顔")] if a.with_face else []) + VIEWS[1:]
    W = LABEL_W + PAD + (CELL + PAD) * len(views)
    H = HEAD_H + PAD + (CELL + PAD) * len(a.groups)
    sheet = Image.new("RGB", (W, H), (250, 247, 240))
    d = ImageDraw.Draw(sheet)
    d.text((PAD, 16), a.title, font=font(34), fill=(70, 50, 40))
    for i, (_, jp) in enumerate(views):
        x = LABEL_W + PAD + i * (CELL + PAD)
        d.text((x + CELL // 2, HEAD_H - 8), jp, font=font(26), fill=(110, 90, 80), anchor="ms")
    for r, g in enumerate(a.groups):
        y = HEAD_H + PAD + r * (CELL + PAD)
        d.text((PAD, y + 10), f"組{g}", font=font(120), fill=(200, 140, 40))
        d.text((PAD, y + 160), STYLE.get(g, ""), font=font(22), fill=(70, 50, 40))
        v = verdict.get(g, "")
        if v:
            head, _, why = v.partition(":")
            d.text((PAD, y + 210), head, font=font(36), fill=(40, 140, 70) if head.startswith("合格") else (200, 60, 60))
            for k in range(0, len(why), 11):
                d.text((PAD, y + 260 + (k // 11) * 30), why[k:k + 11], font=font(22), fill=(90, 70, 60))
        for i, (name, _) in enumerate(views):
            x = LABEL_W + PAD + i * (CELL + PAD)
            p = C.CAND_DIR / g / f"{name}.png"
            d.rectangle((x - 1, y - 1, x + CELL, y + CELL), outline=(220, 210, 200))
            if p.exists():
                sheet.paste(Image.open(p).convert("RGB").resize((CELL, CELL), Image.LANCZOS), (x, y))
            else:
                d.text((x + CELL // 2, y + CELL // 2), "未生成", font=font(30), fill=(160, 150, 150), anchor="mm")
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(a.out)
    print(f"保存しました: {a.out}（{W}x{H}）")


if __name__ == "__main__":
    main()
