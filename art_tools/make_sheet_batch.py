# -*- coding: utf-8 -*-
"""make_sheet_batch.py - 図鑑の便ごとの確認シート（上段＝図鑑の一覧サイズ・下段＝大きめ）。名前は hints.json から
2026-10-17：--face EXPR で faces.json の位置と顔の型（faceType）どおりにSVGの顔を重ねる（顔の型の確認シート）
使い方：python make_sheet_batch.py --ids r01 r02 ... --out D:/claude/チーズ育成/art/zukan/一覧_第1便_YYYYMMDD.png --title "..."
"""
import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config as C  # noqa: E402
from art_common import font, on_checker  # noqa: E402
import face_preview as FPV  # noqa: E402


def load_body(cid, face=None, style=None):
    im = Image.open(C.ZUKAN_DIR / f"{cid}.png").convert("RGBA")
    if not face:
        return im
    f = json.loads(C.FACES_JSON.read_text(encoding="utf-8"))["faces"][cid]
    W, H = im.size
    cx, cy, w = f["cx"] * W // 1000, f["cy"] * H // 1000, f["w"] * W // 1000
    s = dict(style)
    s["lineWidth"] = max(1, s["lineWidthImagePermille"] * W // w)
    return FPV.draw_face(im, cx, cy, w, f.get("tilt") or 0, face, s, f.get("faceType") or "maru")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids", nargs="+", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--title", default="")
    ap.add_argument("--small", type=int, default=128)
    ap.add_argument("--big", type=int, default=380)
    ap.add_argument("--scols", type=int, default=10)
    ap.add_argument("--bcols", type=int, default=5)
    ap.add_argument("--face", help="重ねる表情（normal 等）。省略で顔なし")
    a = ap.parse_args()
    d = json.loads(C.HINTS_JSON.read_text(encoding="utf-8"))
    name = {c["id"]: c["name"] for c in d["cards"] + d["secretCards"]}
    style = json.loads(C.FACE_STYLE_JSON.read_text(encoding="utf-8"))
    ftype = {k: v.get("faceType") for k, v in json.loads(C.FACES_JSON.read_text(encoding="utf-8"))["faces"].items()}
    bodies = {cid: load_body(cid, a.face, style) for cid in a.ids}
    pad = 24
    sw, sh = a.small + 40, a.small + 58          # 小さいセル（名前2行ぶん）
    bw, bh = a.big, a.big + 46
    srows = (len(a.ids) + a.scols - 1) // a.scols
    brows = (len(a.ids) + a.bcols - 1) // a.bcols
    W = max(a.scols * (sw + pad), a.bcols * (bw + pad)) + pad
    H = 90 + 50 + srows * (sh + pad) + 60 + brows * (bh + pad) + pad
    s = Image.new("RGB", (W, H), (248, 245, 238))
    dr = ImageDraw.Draw(s)
    dr.text((pad, 20), a.title, font=font(36), fill=(70, 50, 40))
    y = 90
    dr.text((pad, y), f"上段：図鑑の一覧サイズ（{a.small}px）", font=font(26), fill=(120, 90, 70))
    y += 50
    for i, cid in enumerate(a.ids):
        r, c = divmod(i, a.scols)
        x, yy = pad + c * (sw + pad), y + r * (sh + pad)
        s.paste(on_checker(bodies[cid], a.small), (x + 20, yy))
        nm = name.get(cid, "?")
        f = font(15)
        line1, line2 = (nm, "") if len(nm) <= 9 else (nm[:9], nm[9:18])
        dr.text((x + sw // 2, yy + a.small + 6), line1, font=f, fill=(70, 50, 40), anchor="ma")
        if line2:
            dr.text((x + sw // 2, yy + a.small + 26), line2, font=f, fill=(70, 50, 40), anchor="ma")
    y += srows * (sh + pad) + 10
    dr.line((pad, y, W - pad, y), fill=(210, 200, 185), width=3)
    y += 20
    dr.text((pad, y), f"下段：大きめ（{a.big}px）", font=font(26), fill=(120, 90, 70))
    y += 40
    for i, cid in enumerate(a.ids):
        r, c = divmod(i, a.bcols)
        x, yy = pad + c * (bw + pad), y + r * (bh + pad)
        lab, fs = f"{cid} {name.get(cid, '?')}" + (f"［{ftype.get(cid)}］" if a.face else ""), 20
        while fs > 12 and dr.textlength(lab, font=font(fs)) > bw:   # 長い名前は字を小さくして枠に収める
            fs -= 1
        dr.text((x, yy + 6), lab, font=font(fs), fill=(70, 50, 40))
        s.paste(on_checker(bodies[cid], a.big), (x, yy + 40))
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    s.save(a.out)
    print(f"保存しました: {a.out}（{W}x{H}・{len(a.ids)}種）")


if __name__ == "__main__":
    main()
