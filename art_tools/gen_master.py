# -*- coding: utf-8 -*-
"""gen_master.py - マスター候補 5組×3面（相棒・白カビ・大きなホイール。すべて顔なし）＝15枚を作る

元：D:/claude/ウーパーちゃん/work/tools/gen_master.py（正面→横→丸のみ顔）。チーズ用に面と保存先を直した。
指示文の正本は prompts/master_prompts.md の <!-- prompt: 組/面 --> 直後の ```text ブロック。

各組の作る順（後の面は前の面を参照にして絵柄をそろえる）：
  1. buddy … 相棒の基本形＝最初の相棒になるクリームチーズ（r01）。参照なし（--bootstrap-master）
  2. soft  … 白カビの小さな円盤（ふわふわの表面の描き方の見本）。buddy を参照
  3. wheel … 大きなハードのホイール（一切れ欠け）。buddy＋soft を参照

使い方：
  python gen_master.py --dry-run              # 送る内容と見込み額だけ（キー不要・課金なし）
  python gen_master.py                        # 15枚（既にある画像は飛ばす＝二重課金しない）
  python gen_master.py --groups 1 --views buddy
  python gen_master.py --redo 2/soft          # 1枚作り直し（旧画像は soft_try1.png に退避・最大4回）
出力：config.CAND_DIR/<組>/<面>.png（背景マゼンタのまま。透過は cut_bg.py）
"""
import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config as C  # noqa: E402
from runner import run_one  # noqa: E402

GROUPS = ["1", "2", "3", "4", "5"]
VIEWS = ["buddy", "soft", "wheel"]
REFS_OF = {"buddy": [], "soft": ["buddy"], "wheel": ["buddy", "soft"]}


def load_prompts(keys=None):
    if not C.PROMPT_MD.is_file():
        sys.exit(f"指示文ファイルがありません: {C.PROMPT_MD}")
    text = C.PROMPT_MD.read_text(encoding="utf-8")
    found = dict(re.findall(r"<!-- prompt: ([\w/]+) -->\s*```text\n(.*?)\n```", text, flags=re.S))
    need = keys or [f"{g}/{v}" for g in GROUPS for v in VIEWS]
    missing = [k for k in need if not found.get(k, "").strip()]
    if missing:
        sys.exit(f"指示文が見つからない組/面があります: {', '.join(missing)}")
    return {k: found[k].strip() for k in found}


def main():
    sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
    ap = argparse.ArgumentParser()
    ap.add_argument("--groups", nargs="+", choices=GROUPS, default=GROUPS)
    ap.add_argument("--views", nargs="+", choices=VIEWS, default=VIEWS)
    ap.add_argument("--redo", action="append", default=[], metavar="組/面")
    ap.add_argument("--size", default="2K", choices=["1K", "2K", "4K"])
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    prompts = load_prompts()
    for r in a.redo:
        if r not in prompts:
            sys.exit(f"--redo の指定が不正です: {r}（例 2/soft）")

    res = {}
    for g in a.groups:
        gdir = C.CAND_DIR / g
        for v in VIEWS:
            if v not in a.views:
                continue
            key = f"{g}/{v}"
            r = run_one(gdir / f"{v}.png", prompts[key], [gdir / f"{x}.png" for x in REFS_OF[v]],
                        kind="master", key=key, size=a.size, bootstrap=(v == "buddy"),
                        redo=(key in a.redo), dry=a.dry_run)
            res.setdefault(r, []).append(key)
            if r in ("nokey", "stop"):
                print("キー未設定で止まりました。" if r == "nokey" else "費用の停止ラインで止まりました。d に報告。")
                print(f"結果：{res}")
                sys.exit(2 if r == "nokey" else 6)
    n = len(res.get("made", []))
    est = (C.est_x10000(C.DEFAULT_MODEL, a.size) or 0) * n
    print(f"\n{'予定' if a.dry_run else '生成'} {n}枚・見込み {C.usd_str(est)} USD ≒ {C.yen_of(est)}円（150円/USD仮定）")
    print(f"結果：{ {k: v for k, v in res.items() if k != 'made'} }")
    if any(f"{g}/buddy" in a.redo for g in a.groups):
        print("注意：buddy を作り直した組は、soft・wheel も新しい buddy で作り直す")


if __name__ == "__main__":
    main()
