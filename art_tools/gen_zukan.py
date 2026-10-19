# -*- coding: utf-8 -*-
"""gen_zukan.py - 図鑑の体（顔なし）を1種ずつ作る（絵の制作計画 v2 区分B）

- 指示文の正本は prompts/zukan_prompts.md の <!-- zukan: ID --> 直後のブロック（key/src/width/subject/face）
- 前後の共通文（絵柄・構図・背景）はこのファイルの TEMPLATE。組3マスターの指示文（master_prompts.md 3/*）と同じ文
- 参照画像は既定で config.MASTER_REFS（組3の3面：相棒・白カビ・ホイール）。--ref で足せる（同じタイプの合格1体など）
- 出力：config.ZUKAN_DIR/raw/<id>.png（マゼンタ背景のまま）。透過と検査は check_zukan.py
- 作り直しは --redo（旧画像は raw/<id>_tryN.png に退避）。1種あたりの上限は --max-attempts（既定3＝初回＋作り直し2回）
- --fix "..." を付けると、作り直しの指示文の末尾に直したい点を足す
- 記録と費用の停止は gen_panel.py が行う（5,000円を超える呼び出しはしない）

使い方：
  python gen_zukan.py --ids r02 r04 --dry-run
  python gen_zukan.py --ids r02 r04
  python gen_zukan.py --ids r08 --redo --fix "Make the disc even wider and thinner."
"""
import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config as C  # noqa: E402
from runner import run_one  # noqa: E402

ZUKAN_MD = C.TOOLS / "prompts" / "zukan_prompts.md"
RAW_DIR = C.ZUKAN_DIR / "raw"

TEMPLATE = """Use exactly the same art style as images 1, 2 and 3 (outline color and thickness, two-step cel shading, small soft highlight, texture, level of detail). Do not copy their shapes or their cheese colors.
Original illustration of a cheese as a cute pet object (not based on any existing character, mascot or product).
Subject: {subject}
No face: do not draw eyes, mouth, nose, eyebrows, blush or any facial features. {face} (a face will be added later by the app).
Art style: clean sticker-like kawaii illustration. Bold, smooth, even dark-brown outlines (#4A3426), about 1.5% of the image width, with rounded line ends, the same thickness as in images 1-3. Flat colors with two-step cel shading and one small soft highlight. Crisp and simple, easy to read at small sizes like a chat sticker.
View: three-quarter view from slightly above (about 20 degrees).
Composition: square 1:1 image. One single cheese centered, about {width}% of the image width, with a comfortable margin on every side. No plate, no knife, no packaging, no label, no box, no text, no other objects except those described in the subject. No white sticker border.
Background: one flat solid pure magenta color (#FF00FF) filling the whole background, completely uniform, no gradient, no texture, no floor, no shadow, no contact shadow, no reflection. Do not use pink, magenta or purple anywhere on the cheese."""


def load_blocks():
    text = ZUKAN_MD.read_text(encoding="utf-8")
    out = {}
    for cid, body in re.findall(r"<!-- zukan: (\w+) -->\s*```text\n(.*?)\n```", text, flags=re.S):
        d = {}
        for line in body.splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                d[k.strip()] = v.strip()
        out[cid] = d
    return out


def build_prompt(b, fix=""):
    p = TEMPLATE.format(subject=b["subject"], face=b["face"][0].upper() + b["face"][1:], width=b["width"])
    if fix:
        p += "\nImportant correction: " + fix.strip()
    return p


def main():
    sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids", nargs="+", required=True)
    ap.add_argument("--ref", action="append", default=[], help="追加の参照画像（マスター3面の後ろに足す）")
    ap.add_argument("--redo", action="store_true")
    ap.add_argument("--fix", default="")
    ap.add_argument("--max-attempts", type=int, default=3)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    blocks = load_blocks()
    refs = [str(p) for p in C.MASTER_REFS] + a.ref
    results = {}
    for cid in a.ids:
        b = blocks.get(cid)
        if not b:
            print(f"[なし] {cid} の指示文が zukan_prompts.md にありません")
            results[cid] = "noprompt"
            continue
        out = RAW_DIR / f"{cid}.png"
        tries = len(list(RAW_DIR.glob(f"{cid}_try*.png"))) + (1 if out.exists() else 0)
        if a.redo and tries >= a.max_attempts:
            print(f"[上限] {cid} は既に{tries}回作っています（上限 {a.max_attempts}）。保留にしてください")
            results[cid] = "limit"
            continue
        r = run_one(out, build_prompt(b, a.fix), refs, kind="zukan", key=cid, size="2K",
                    redo=a.redo, dry=a.dry_run)
        results[cid] = r
        if r in ("nokey", "stop"):
            break
    print("結果：", results)


if __name__ == "__main__":
    main()
