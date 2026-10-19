# -*- coding: utf-8 -*-
"""gen_mix.py - 指示文の正本から1つ取り出し、参照画像を順に渡して1枚作る（組をまたぐ混ぜ指定・1か所の編集）

元：D:/claude/ウーパーちゃん/work/tools/gen_mix.py。チーズ用に指示文と保存先・記録を config に寄せた。
- 指示文は prompts/master_prompts.md の <!-- prompt: KEY --> 直後のブロック（例 6/buddy_a・face/v_normal）
- 参照画像は --ref の順のまま送る（指示文の「1枚目・2枚目」と対応）
- 「線だけ太く」のような1か所の編集も、できた画像を --ref 1枚目に渡して使う（ウーパー組6で効いた方法）

使い方：
  python gen_mix.py --key 6/buddy_a --out D:/claude/チーズ育成/art/master_candidates/6/buddy_a.png ^
      --ref D:/claude/チーズ育成/art/master_candidates/1/buddy.png --ref D:/claude/チーズ育成/art/master_candidates/3/buddy.png
  --dry-run で送る内容と見込み額だけ表示
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gen_master import load_prompts  # noqa: E402
from runner import run_one  # noqa: E402


def main():
    sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
    ap = argparse.ArgumentParser()
    ap.add_argument("--key", required=True)
    ap.add_argument("--ref", action="append", default=[], required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--kind", default="master")
    ap.add_argument("--size", default="2K", choices=["1K", "2K", "4K"])
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    prompts = load_prompts(keys=[a.key])
    for r in a.ref:
        if not Path(r).is_file() and not a.dry_run:
            sys.exit(f"参照画像がありません: {r}")
    out = Path(a.out)
    r = run_one(out, prompts[a.key], a.ref, kind=a.kind, key=a.key, size=a.size,
                redo=out.exists(), dry=a.dry_run)
    print(f"結果：{r}")
    sys.exit({"made": 0, "skip": 0, "nokey": 2, "stop": 6}.get(r, 1))


if __name__ == "__main__":
    main()
