# -*- coding: utf-8 -*-
"""edit_from.py - 土台の1枚から「他は一切変えず、◯◯だけ」の部分編集を N 枚（1〜4）、互いに独立に作る

元：D:/claude/ウーパーちゃん/work/tools/edit_from.py（4コマ用で gen_daily.py に依存）。チーズ用に依存を外して汎用にした。
用途：図鑑の体の作り直し（崩れた所だけ直す）／最終段階（ヴィンテージ）の顔つき特別版
      （土台＝体＋SVGの顔を重ねた face_preview.py の出力。顔の位置・大きさ・表情は変えずに描き込みだけ足す）
- 参照画像：1枚目＝土台、2枚目以降＝--ref（マスター等。キャラ固定の参照は5枚以内）
- 出力：<outdir>/<tag><k>.png（既にあれば飛ばす）。指示文と参照の順を <tag><k>_prompt.txt に残す
- 記録と費用の停止は gen_panel.py が行う

使い方：
  python edit_from.py --base X.png --ref M.png --outdir DIR --tag r07_fix --n 2 --fix "Change only ...; keep everything else exactly the same."
  python edit_from.py ... --dry-run
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from runner import run_one  # noqa: E402

EDIT_PREFIX = ("Edit image 1. Keep everything in image 1 exactly the same (shape, outline color and thickness, colors, "
               "texture, size, position, background) except for the change described below. "
               "Images 2 and later are style references only; do not copy their shapes.\n")


def main():
    sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True)
    ap.add_argument("--ref", action="append", default=[])
    ap.add_argument("--outdir", required=True)
    ap.add_argument("--tag", required=True)
    ap.add_argument("--start", type=int, default=1)
    ap.add_argument("--n", type=int, default=1)
    ap.add_argument("--fix", required=True, help="直す所（英文）")
    ap.add_argument("--kind", default="edit")
    ap.add_argument("--size", default="2K", choices=["1K", "2K", "4K"])
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    if not 1 <= a.n <= 4:
        sys.exit("--n は 1〜4")
    base = Path(a.base)
    if not base.is_file() and not a.dry_run:
        sys.exit(f"土台がありません: {base}")
    prompt = EDIT_PREFIX + a.fix.strip()
    codes = []
    for k in range(a.start, a.start + a.n):
        r = run_one(Path(a.outdir) / f"{a.tag}{k}.png", prompt, [base] + a.ref, kind=a.kind,
                    key=f"{a.tag}{k}", size=a.size, dry=a.dry_run)
        codes.append(r)
        if r in ("nokey", "stop"):
            break
    print(f"結果：{codes}")


if __name__ == "__main__":
    main()
