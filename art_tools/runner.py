# -*- coding: utf-8 -*-
"""runner.py - gen_master.py / gen_mix.py / edit_from.py 共通：1枚を gen_panel.py で作る（作り直しの退避・回数の上限）

- 既に出力があれば <名前>_tryN.png・_tryN_prompt.txt・_tryN_usage.json に退避してから作る（ウーパーちゃんと同じ形）
- 1枚につき config.MAX_ATTEMPTS 回（初回＋作り直し3回）まで
- 送った指示文と参照画像の順を <名前>_prompt.txt に残す
"""
import os
import subprocess
import sys
from pathlib import Path

import config as C

GEN_PANEL = C.TOOLS / "gen_panel.py"


def attempt_of(out, redo):
    tries = sorted(out.parent.glob(f"{out.stem}_try*.png"))
    return len(tries) + 1 + (1 if (redo and out.exists()) else 0)


def run_one(out, prompt, refs, kind, key, size="2K", model=None, bootstrap=False, redo=False, dry=False, aspect="1:1", no_guard=False):
    """戻り値：'made' / 'skip' / 'limit' / 'fail' / 'stop'（費用の停止） / 'nokey'"""
    out = Path(out)
    model = model or C.DEFAULT_MODEL
    if out.exists() and not redo:
        print(f"[飛ばす] {key} は作成済み: {out}")
        return "skip"
    attempt = attempt_of(out, redo)
    if attempt > C.MAX_ATTEMPTS:
        print(f"[上限] {key} は既に{C.MAX_ATTEMPTS}回作っています。指示文を見直して d に相談してください")
        return "limit"
    cmd = [sys.executable, str(GEN_PANEL), "--out", str(out), "--model", model, "--size", size,
           "--aspect", aspect, "--kind", kind, "--key", key, "--attempt", str(attempt)]
    if bootstrap:
        cmd.append("--bootstrap-master")
    if no_guard:
        cmd.append("--no-guard")
    for r in refs:
        cmd += ["--ref", str(r)]
    env = dict(os.environ, PYTHONIOENCODING="utf-8")
    if dry:
        print(f"\n===== {key}（{attempt}回目の予定） =====")
        subprocess.run(cmd + ["--prompt", prompt, "--dry-run"], env=env)
        return "made"
    lacking = [str(r) for r in refs if not Path(r).exists()]
    if lacking:
        print(f"[保留] {key}：参照画像がまだありません（{', '.join(lacking)}）")
        return "fail"
    out.parent.mkdir(parents=True, exist_ok=True)
    pfile = out.with_name(out.stem + "_prompt.txt")
    if redo and out.exists():
        keep = out.with_name(f"{out.stem}_try{attempt - 1}.png")
        out.rename(keep)
        if pfile.exists():
            pfile.replace(out.with_name(f"{out.stem}_try{attempt - 1}_prompt.txt"))
        uj = out.with_name(out.stem + "_usage.json")
        if uj.exists():
            uj.replace(out.with_name(f"{out.stem}_try{attempt - 1}_usage.json"))
        print(f"[退避] 旧画像 → {keep.name}")
    note = "参照画像（この順で送った）:\n" + "\n".join(f"  {i + 1}. {r}" for i, r in enumerate(refs))
    pfile.write_text(prompt + "\n\n# " + note.replace("\n", "\n# ") + "\n", encoding="utf-8")
    print(f"[生成] {key}（{attempt}回目）…")
    rc = subprocess.run(cmd + ["--prompt", prompt], env=env).returncode   # _prompt.txt の末尾の「# 参照画像」は送らない
    if rc == 2:
        return "nokey"
    if rc == 6:
        return "stop"
    if rc != 0 or not out.exists():
        print(f"[失敗] {key}（終了コード {rc}）")
        return "fail"
    return "made"
