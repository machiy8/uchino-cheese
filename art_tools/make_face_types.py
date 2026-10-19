# -*- coding: utf-8 -*-
"""make_face_types.py - 顔の型×表情の見本シートと、アプリ用の SVG 部品を書き出す（課金なし）

- 見本シート：行＝型（8）・列＝表情（11）。クリーム色の丸い面の上に描く（体に依らない見え方）
- SVG：<out_dir>/svg/<type>_<expr>.svg（顔の幅＝1000・中心＝(500,500)・線の太さは顔の幅 w=400‰ のときの値）
使い方：python make_face_types.py --out-dir D:/claude/チーズ育成/art/faces [--cell 220]
"""
import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config as C  # noqa: E402
import face_parts as FP  # noqa: E402
from art_common import font  # noqa: E402

SS = 4


def render_face(size, face_type, expr, style, face_w_frac=0.62, bg=(253, 246, 232), lw_units=None):
    W = size * SS
    layer = Image.new("RGBA", (W, W), bg + (255,))
    d = ImageDraw.Draw(layer)
    d.ellipse((W * 0.06, W * 0.06, W * 0.94, W * 0.94), fill=(250, 238, 214, 255), outline=(88, 40, 25, 255), width=int(W * 0.013))
    k = W * face_w_frac / 1000
    cx = cy = W / 2
    lw = lw_units or (style["lineWidthImagePermille"] * 1000 // int(face_w_frac * 1000))
    FP.draw_pillow(d, FP.shapes(face_type, expr, style, lw), lambda x, y: (cx + x * k, cy + y * k), k)
    return layer.resize((size, size), Image.LANCZOS).convert("RGB")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--out-dir", default=str(C.ART_ROOT / "faces"))
    ap.add_argument("--cell", type=int, default=200)
    ap.add_argument("--sheet-name", default="顔の型_表情見本.png")
    a = ap.parse_args()
    style = json.loads(C.FACE_STYLE_JSON.read_text(encoding="utf-8"))
    types = list(style["types"].keys())
    od = Path(a.out_dir)
    (od / "svg").mkdir(parents=True, exist_ok=True)
    lw400 = style["lineWidthImagePermille"] * 1000 // 400
    n = 0
    for t in types:
        for e in FP.EXPRS:
            (od / "svg" / f"{t}_{e}.svg").write_text(
                FP.to_svg(FP.shapes(t, e, style, lw400), extra_attr=f' data-type="{t}" data-expr="{e}"'), encoding="utf-8")
            n += 1
    c, pad, left, top = a.cell, 12, 230, 110
    Wd = left + len(FP.EXPRS) * (c + pad) + pad
    Hd = top + len(types) * (c + pad) + pad
    sheet = Image.new("RGB", (Wd, Hd), (248, 245, 238))
    dr = ImageDraw.Draw(sheet)
    dr.text((pad, 14), "顔の型 8つ × 表情（通常〜口パクの10＋しょんぼり）  2026-10-17 案", font=font(32), fill=(70, 50, 40))
    for j, e in enumerate(FP.EXPRS):
        dr.text((left + j * (c + pad) + c // 2, top - 34), FP.EXPR_JA[e], font=font(22), fill=(90, 60, 45), anchor="ma")
    for i, t in enumerate(types):
        y = top + i * (c + pad)
        dr.text((pad, y + c // 2 - 30), t, font=font(24), fill=(70, 50, 40))
        dr.text((pad, y + c // 2 + 2), style["types"][t]["ja"], font=font(17), fill=(110, 80, 60))
        for j, e in enumerate(FP.EXPRS):
            sheet.paste(render_face(c, t, e, style), (left + j * (c + pad), y))
    out = od / a.sheet_name
    sheet.save(out)
    print(f"保存しました: {out}（{Wd}x{Hd}）・SVG {n}枚: {od / 'svg'}")


if __name__ == "__main__":
    main()
