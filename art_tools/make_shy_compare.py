# -*- coding: utf-8 -*-
"""make_shy_compare.py - 照れの見分けチェック用の比較シート（2026-10-17 照れの作り直し）

行＝顔の型8つ・列＝旧照れ／新照れ／しょんぼり／泣き／笑顔。左は 200px、右は実寸 128px（アプリの小さい表示）。
旧照れは face_parts.py.bak-20261017-shy（作り直し前）で描く。課金なし。
使い方：python make_shy_compare.py [--out D:/claude/チーズ育成/art/faces/照れ比較_20261017.png]
"""
import argparse
import importlib.util
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import config as C  # noqa: E402
import face_parts as FP  # noqa: E402
import make_face_types as MF  # noqa: E402
from art_common import font  # noqa: E402


def load_old():
    spec = importlib.util.spec_from_file_location("face_parts_old", HERE / "face_parts.py.bak-20261017-shy",
                                                  loader=importlib.machinery.SourceFileLoader("face_parts_old", str(HERE / "face_parts.py.bak-20261017-shy")))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(C.ART_ROOT / "faces" / "照れ比較_20261017.png"))
    a = ap.parse_args()
    style = json.loads(C.FACE_STYLE_JSON.read_text(encoding="utf-8"))
    old = load_old()
    cols = [("旧照れ", "old"), ("新照れ", "shy"), ("しょんぼり", "sad"), ("泣き", "cry"), ("笑顔", "smile")]
    types = list(style["types"].keys())
    big, small, pad, left, top = 200, 128, 10, 230, 120
    gap = 60
    xb = left
    xs = left + len(cols) * (big + pad) + gap
    W = xs + len(cols) * (small + pad) + pad
    H = top + len(types) * (big + pad) + pad
    sheet = Image.new("RGB", (W, H), (248, 245, 238))
    dr = ImageDraw.Draw(sheet)
    dr.text((pad, 14), "照れの作り直し 比較（左 200px／右 実寸128px）2026-10-17", font=font(30), fill=(70, 50, 40))
    for j, (ja, _) in enumerate(cols):
        dr.text((xb + j * (big + pad) + big // 2, top - 36), ja, font=font(22), fill=(150, 60, 40) if ja == "新照れ" else (90, 60, 45), anchor="ma")
        dr.text((xs + j * (small + pad) + small // 2, top - 32), ja, font=font(16), fill=(150, 60, 40) if ja == "新照れ" else (90, 60, 45), anchor="ma")
    orig = MF.FP
    for i, t in enumerate(types):
        y = top + i * (big + pad)
        dr.text((pad, y + big // 2 - 30), t, font=font(24), fill=(70, 50, 40))
        dr.text((pad, y + big // 2 + 2), style["types"][t]["ja"], font=font(16), fill=(110, 80, 60))
        for j, (_, e) in enumerate(cols):
            for size, x0 in ((big, xb + j * (big + pad)), (small, xs + j * (small + pad))):
                MF.FP = old if e == "old" else orig
                im = MF.render_face(size, t, "shy" if e == "old" else e, style)
                MF.FP = orig
                sheet.paste(im, (x0, y + (big - size) // 2 if size == small else y))
    out = Path(a.out)
    sheet.save(out)
    print(f"保存しました: {out}（{W}x{H}）")


if __name__ == "__main__":
    main()
