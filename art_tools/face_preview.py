# -*- coding: utf-8 -*-
"""face_preview.py - 顔なしの体に「SVGの顔」を重ねた見本を作る（faces.json の位置合わせ・最終段階の土台づくり）

絵の制作計画 v2 §1-1：顔はアプリの SVG 部品で描く。ここでは同じ形（face_style.json の数値）を Pillow で描いて
位置・大きさを目で確かめる。--svg-out で同じ形の SVG も書き出す（アプリの部品の下書き・見た目の照合用）。
最終段階（ヴィンテージ）の顔つき特別版は、この出力（体＋SVGの顔）を edit_from.py の土台にして
「顔の位置・大きさ・表情は変えず、描き込みだけ足す」ので、ふだんの顔とつながる（計画 v2 §2-2）。

2026-10-17：顔は「性格別の顔の型（faces.json の faceType）×表情」になった（face_parts.py）。表情は face_parts.EXPRS。
表情（相棒仕様 v2 の顔と、計画 v2 の最終段階の4枚）：
  normal（ふつう）・smile（ごきげん：口を開けた笑顔）・sad（しょんぼり）・sleep（ねむい：目を閉じる＝まばたき兼用）
  shy（照れ）・surprised（驚き）・proud（得意げ）・cry（泣き）・talk（口パク）
すね は顔を描かず体を左右反転（--sulk）。

使い方：
  python face_preview.py BODY.png OUT.png --id r01 --expr normal smile sad sleep
  python face_preview.py BODY.png OUT.png --cx 500 --cy 540 --w 380 --expr normal --svg-out face_normal.svg
  python face_preview.py BODY.png OUT.png --id r01 --expr smile --vintage   # 最終段階の色の深め方を体にかける（仮の値）
  python face_preview.py BODY.png BODY_v.png --id r01 --expr none --vintage --bg none   # paste_face.py の --base（最終段階の色の体・透過のまま）
複数の --expr を渡すと横に並べた1枚、--each なら表情ごとに OUT_<expr>.png
"""
import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config as C  # noqa: E402
import face_parts as FP  # noqa: E402

EXPRS = FP.EXPRS + ["none"]
SS = 4  # 4倍で描いて縮める（線のぎざぎざを消す）


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def load_style():
    return json.loads(C.FACE_STYLE_JSON.read_text(encoding="utf-8"))


def face_box(args, W, H):
    if args.id:
        f = json.loads(C.FACES_JSON.read_text(encoding="utf-8"))["faces"].get(args.id)
        if not f:
            sys.exit(f"faces.json に {args.id} がありません")
        cx = args.cx if args.cx is not None else f["cx"]
        cy = args.cy if args.cy is not None else f["cy"]
        w = args.w if args.w is not None else f["w"]
        tilt = f.get("tilt") or 0
    else:
        cx, cy, w, tilt = args.cx, args.cy, args.w, 0
    if None in (cx, cy, w):
        sys.exit("顔の位置が未決です（faces.json の cx・cy・w が null）。--cx --cy --w で仮に与えてください")
    return cx * W // 1000, cy * H // 1000, w * W // 1000, tilt


def face_type_of(fid, default="maru"):
    """faces.json の faceType（性格別の顔の型）。未決なら default"""
    if not fid:
        return default
    f = json.loads(C.FACES_JSON.read_text(encoding="utf-8"))["faces"].get(fid) or {}
    return f.get("faceType") or default


def draw_face(img, cx, cy, w, tilt, expr, s, face_type="maru"):
    """体に顔を重ねる。形は face_parts.shapes()（型×表情）。2026-10-17 から型つき（旧の単一の顔は face_preview.py.bak-20261017）"""
    if expr == "none":                                        # 顔なし（最終段階の色にした体だけ等）
        return img.convert("RGBA").copy()
    W, H = img.size
    layer = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    k = w * SS / 1000.0
    FP.draw_pillow(d, FP.shapes(face_type, expr, s, s["lineWidth"]), lambda x, y: (cx * SS + x * k, cy * SS + y * k), k)
    if tilt:
        layer = layer.rotate(-tilt, center=(cx * SS, cy * SS), resample=Image.BICUBIC)
    layer = layer.resize((W, H), Image.LANCZOS)
    out = img.convert("RGBA").copy()
    out.alpha_composite(layer)
    return out


def to_svg(expr, s, face_type="maru", size=1000):
    """顔だけの SVG（顔の幅=1000・中心=(500,500)）。アプリの部品の下書き"""
    return FP.to_svg(FP.shapes(face_type, expr, s, s["lineWidth"]), size, f' data-type="{face_type}" data-expr="{expr}"')


def vintage_tone(img, s):
    v = s.get("vintageTone", {})
    rgba = img.convert("RGBA")
    rgb = ImageEnhance.Color(rgba.convert("RGB")).enhance(v.get("saturationPermille", 1000) / 1000)
    rgb = ImageEnhance.Brightness(rgb).enhance(v.get("multiplyPermille", 1000) / 1000)
    rgb.putalpha(rgba.getchannel("A"))
    return rgb


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("body")
    ap.add_argument("out")
    ap.add_argument("--id")
    ap.add_argument("--cx", type=int)
    ap.add_argument("--cy", type=int)
    ap.add_argument("--w", type=int)
    ap.add_argument("--expr", nargs="+", default=["normal"], choices=EXPRS)
    ap.add_argument("--each", action="store_true")
    ap.add_argument("--vintage", action="store_true", help="最終段階の色の深め方を体にかける（face_style.json の仮の値）")
    ap.add_argument("--sulk", action="store_true", help="すね（顔なし・左右反転）も並べる")
    ap.add_argument("--bg", default="#FFFFFF", help="透過の体の後ろに敷く色（AIの土台にするときは #FF00FF・透過のまま残すなら none）")
    ap.add_argument("--svg-out", help="最初の表情の顔だけの SVG を書き出す")
    ap.add_argument("--type", help="顔の型（省略時は faces.json の faceType）")
    a = ap.parse_args()
    s = load_style()
    body = Image.open(a.body).convert("RGBA")
    if a.vintage:
        body = vintage_tone(body, s)
    W, H = body.size
    cx, cy, w, tilt = face_box(a, W, H)
    if s.get("lineWidthImagePermille") and w:          # 体の主線と同じ太さ（画像の幅に対する千分率）を顔の幅の千分率に直す
        s["lineWidth"] = max(1, s["lineWidthImagePermille"] * W // w)
    if a.bg.lower() == "none":
        base = body
    else:
        base = Image.new("RGBA", (W, H), hex2rgb(a.bg) + (255,))
        base.alpha_composite(body)
    keep_alpha = a.bg.lower() == "none"
    ft = a.type or face_type_of(a.id)
    tiles = [(e, draw_face(base, cx, cy, w, tilt, e, s, ft)) for e in a.expr]
    if a.sulk:
        tiles.append(("sulk", base.transpose(Image.FLIP_LEFT_RIGHT)))
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    if a.each or len(tiles) == 1:
        for e, t in tiles:
            p = out if len(tiles) == 1 else out.with_name(f"{out.stem}_{e}.png")
            (t if keep_alpha else t.convert("RGB")).save(p)
            print(f"保存しました: {p}")
    else:
        sheet = Image.new("RGB", (W * len(tiles), H), (255, 255, 255))
        for i, (_, t) in enumerate(tiles):
            sheet.paste(t.convert("RGB"), (i * W, 0))
        sheet.save(out)
        print(f"保存しました: {out}（{[e for e, _ in tiles]}）")
    if a.svg_out:
        Path(a.svg_out).write_text(to_svg(a.expr[0], s, ft), encoding="utf-8")
        print(f"SVG: {a.svg_out}")
    print(json.dumps({"face_px": {"cx": cx, "cy": cy, "w": w, "tilt": tilt}}, ensure_ascii=False))


if __name__ == "__main__":
    main()
