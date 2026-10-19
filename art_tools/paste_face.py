# -*- coding: utf-8 -*-
"""paste_face.py - 最終段階の顔つき特別版：AIが描いた画像から「顔のまわりだけ」を切り取り、元の体に貼る

計画 v2 §2-2「見た目がつながる工夫」の③：AIの編集で体の輪郭や模様が少しずれても、体は元の画像のまま使う。
貼るのは顔の楕円（faces.json の w × --pad）の中だけで、縁は --feather px でぼかす。
- 楕円の外は元の体と画素単位で同じ（作りでそうなる）
- 楕円のすぐ外の輪（幅 --ring px）で AI画像と元の体の差（平均絶対差）を測り、--shift-max を超えたら
  「AIが体を動かした＝顔の位置が合っていない」として警告（終了コード 3）。作り直すか土台を見直す
- アプリ用に、顔の部分だけの切り抜き（RGBA）と位置（json）も書き出す（同梱サイズを抑える）

使い方：python paste_face.py --base BODY_vintage.png --ai AI_out.png --id r01 --out r01_v_normal.png [--pad 1500 --feather 12]
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config as C  # noqa: E402


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True, help="元の体（透過PNG・最終段階の色にしたもの）")
    ap.add_argument("--ai", required=True, help="AIの編集結果（土台＝体＋SVGの顔）")
    ap.add_argument("--id")
    ap.add_argument("--cx", type=int)
    ap.add_argument("--cy", type=int)
    ap.add_argument("--w", type=int)
    ap.add_argument("--pad", type=int, default=1500, help="顔の幅に対する楕円の横幅（千分率）")
    ap.add_argument("--hpad", type=int, default=1100, help="顔の幅に対する楕円の縦幅（千分率）")
    ap.add_argument("--feather", type=int, default=12)
    ap.add_argument("--ring", type=int, default=24)
    ap.add_argument("--shift-max", type=int, default=18, help="輪の平均絶対差の上限（0〜255）")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    base = Image.open(a.base).convert("RGBA")
    W, H = base.size
    ai = Image.open(a.ai).convert("RGB")
    if ai.size != base.size:
        ai = ai.resize(base.size, Image.LANCZOS)
    if a.id:
        f = json.loads(C.FACES_JSON.read_text(encoding="utf-8"))["faces"][a.id]
        cxp, cyp, wp = (a.cx if a.cx is not None else f["cx"]), (a.cy if a.cy is not None else f["cy"]), (a.w if a.w is not None else f["w"])
    else:
        cxp, cyp, wp = a.cx, a.cy, a.w
    if None in (cxp, cyp, wp):
        sys.exit("顔の位置が未決です（faces.json の cx・cy・w）")
    cx, cy, w = cxp * W // 1000, cyp * H // 1000, wp * W // 1000
    rx, ry = w * a.pad // 2000, w * a.hpad // 2000

    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=255)
    soft = mask.filter(ImageFilter.GaussianBlur(a.feather)) if a.feather else mask
    ring = Image.new("L", (W, H), 0)
    ImageDraw.Draw(ring).ellipse((cx - rx - a.ring, cy - ry - a.ring, cx + rx + a.ring, cy + ry + a.ring), fill=255)
    ring_np = (np.asarray(ring) > 0) & ~(np.asarray(mask) > 0) & (np.asarray(base.getchannel("A")) > 0)

    b = np.asarray(base).astype(np.int32)
    x = np.asarray(ai).astype(np.int32)
    shift = int(np.abs(b[..., :3][ring_np] - x[ring_np]).mean()) if ring_np.any() else 0

    m = (np.asarray(soft).astype(np.int32) * (b[..., 3] > 0))[..., None]      # 体の外には貼らない
    rgb = (x * m + b[..., :3] * (255 - m)) // 255
    out = np.dstack([rgb.astype(np.uint8), b[..., 3].astype(np.uint8)])
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(out, "RGBA").save(a.out)

    L, T = max(0, cx - rx - a.feather * 2), max(0, cy - ry - a.feather * 2)
    R, B = min(W, cx + rx + a.feather * 2), min(H, cy + ry + a.feather * 2)
    crop = Image.fromarray(out, "RGBA").crop((L, T, R, B))
    cm = soft.crop((L, T, R, B))
    crop.putalpha(Image.fromarray(np.minimum(np.asarray(cm), np.asarray(crop.getchannel("A"))).astype(np.uint8)))
    cp = Path(a.out).with_name(Path(a.out).stem + "_facecrop.png")
    crop.save(cp)
    outer = np.asarray(soft) == 0                                   # ぼかしが1でも届いた所の外側
    outside_same = bool((out[outer] == np.asarray(base)[outer]).all())
    rep = {"out": a.out, "facecrop": str(cp), "crop_box": [L, T, R, B], "face_px": [cx, cy, w],
           "ring_mean_abs_diff": shift, "shift_ok": shift <= a.shift_max, "outside_identical": outside_same}
    Path(a.out).with_name(Path(a.out).stem + "_paste.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1),
                                                                        encoding="utf-8")
    print(json.dumps(rep, ensure_ascii=False))
    if shift > a.shift_max:
        print("警告：顔のまわりで体がずれています（AIが体を動かした）。作り直すか土台を見直してください", file=sys.stderr)
        sys.exit(3)


if __name__ == "__main__":
    main()
