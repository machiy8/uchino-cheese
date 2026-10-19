# -*- coding: utf-8 -*-
"""make_overview.py - 図鑑の体（透過PNG）を ID 順に並べた一覧（毎日のオーナー確認・近い種の比較：検査 #12）

元：D:/claude/ウーパーちゃん/work/tools/make_overview.py（組版画像の一覧）。チーズ用に図鑑のIDと名前で並べる形にした。
- 画像は config.ZUKAN_DIR/<id>.png（cut_bg.py の出力）。無いIDは「未生成」
- 名前は hints.json（cards＋secretCards）から引く
- --small 160 を付けると、各セルの右下に160pxの縮小も載せる（検査 #6「縮小で分かる」）

使い方：
  python make_overview.py --ids r01 r02 r03 --out D:/claude/チーズ育成/art/一覧_YYYYMMDD.png
  python make_overview.py --type fresh --out ...        # タイプでまとめて
  python make_overview.py --ids r34 r35 --out 比較_ブリー.png --label r34=モー r35=ムラン   # 近い種の比較
"""
import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config as C  # noqa: E402
from art_common import font, on_checker  # noqa: E402


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids", nargs="*", default=[])
    ap.add_argument("--type")
    ap.add_argument("--out", required=True)
    ap.add_argument("--cols", type=int, default=6)
    ap.add_argument("--cell", type=int, default=320)
    ap.add_argument("--small", type=int, default=0)
    ap.add_argument("--label", nargs="*", default=[])
    ap.add_argument("--title", default="")
    ap.add_argument("--dir", default=str(C.ZUKAN_DIR))
    a = ap.parse_args()
    d = json.loads(C.HINTS_JSON.read_text(encoding="utf-8"))
    cards = d["cards"] + d["secretCards"]
    name = {c["id"]: c["name"] for c in cards}
    ids = a.ids or [c["id"] for c in cards if (not a.type or c.get("type") == a.type)]
    labels = dict(x.split("=", 1) for x in a.label)
    pad, cap = 16, 64
    top = 70 if a.title else pad
    rows = (len(ids) + a.cols - 1) // a.cols
    W = a.cols * a.cell + (a.cols + 1) * pad
    H = top + rows * (a.cell + cap + pad)
    sheet = Image.new("RGB", (W, H), (248, 245, 238))
    dr = ImageDraw.Draw(sheet)
    if a.title:
        dr.text((pad, 16), a.title, font=font(34), fill=(70, 50, 40))
    for i, cid in enumerate(ids):
        r, c = divmod(i, a.cols)
        x, y = pad + c * (a.cell + pad), top + r * (a.cell + cap + pad)
        dr.text((x, y + 2), f"{cid} {name.get(cid, '?')}", font=font(22), fill=(70, 50, 40))
        if cid in labels:
            dr.text((x, y + 32), labels[cid], font=font(18), fill=(130, 100, 80))
        p = Path(a.dir) / f"{cid}.png"
        if p.exists():
            im = Image.open(p)
            sheet.paste(on_checker(im, a.cell), (x, y + cap))
            if a.small:
                sm = on_checker(im, a.small)
                sheet.paste(sm, (x + a.cell - a.small, y + cap + a.cell - a.small))
        else:
            dr.rectangle((x, y + cap, x + a.cell, y + cap + a.cell), outline=(220, 210, 200))
            dr.text((x + a.cell // 2, y + cap + a.cell // 2), "未生成", font=font(26), fill=(160, 150, 150), anchor="mm")
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(a.out)
    print(f"保存しました: {a.out}（{W}x{H}・{len(ids)}種）")


if __name__ == "__main__":
    main()
