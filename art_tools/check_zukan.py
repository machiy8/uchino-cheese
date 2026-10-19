# -*- coding: utf-8 -*-
"""check_zukan.py - 図鑑の体の自動検査（計画 v2 §4 の #1 主線・#4 背景の抜け・#11 大きさと中心）と目視用の見本

- raw/<id>.png（マゼンタ背景）を cut_bg.py で透過にして zukan/cut/<id>.png に置き、
  normalize_pad.py で余白をそろえて zukan/<id>.png に書き出す（2026-10-17。主線の検査はそろえる前の cut で測る）
- measure_line.py を体の外接矩形の中心と上下左右の1/4の5点で走らせ、各点の中央値の中央値を主線の太さとする
  基準は config.MASTER_LINE_PX（組3の実測 27px）。±15%（measure_line.py と同じ丸め：22〜32px）
- 目視用：zukan/check/<id>_view.png（市松の上の 640px＋右下に 160px の縮小）
- 結果は zukan/check/<id>.json と、まとめて zukan/check/検査_自動.json

使い方：python check_zukan.py --ids r02 r04
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config as C  # noqa: E402
from art_common import on_checker  # noqa: E402

RAW = C.ZUKAN_DIR / "raw"
CHK = C.ZUKAN_DIR / "check"


def run_json(args):
    r = subprocess.run([sys.executable] + args, capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-800:])
    return json.loads(r.stdout.strip().splitlines()[-1])


def check(cid):
    src, out = RAW / f"{cid}.png", C.ZUKAN_DIR / "cut" / f"{cid}.png"
    final = C.ZUKAN_DIR / f"{cid}.png"
    if not src.exists():
        return {"id": cid, "error": "raw なし"}
    cut = run_json([str(C.TOOLS / "cut_bg.py"), str(src), str(out)])
    norm = run_json([str(C.TOOLS / "normalize_pad.py"), str(out), str(final)])
    L, T, R, B = cut["bbox"]
    cx, cy = (L + R) // 2, (T + B) // 2
    pts = [(cx, cy), (cx - (R - L) // 4, cy), (cx + (R - L) // 4, cy), (cx, cy - (B - T) // 4), (cx, cy + (B - T) // 4)]
    meds, hexes = [], []
    for x, y in pts:
        m = run_json([str(C.TOOLS / "measure_line.py"), str(out), "--x", str(x), "--y", str(y)])
        if m["median_px"] is not None:
            meds.append(m["median_px"])
            hexes.append(m["line_hex"])
    meds.sort()
    line = meds[len(meds) // 2] if meds else None
    ref = C.MASTER_LINE_PX
    lo, hi = ref * 85 // 100, (ref * 115 + 99) // 100
    rep = {"id": cid, "leak": cut["inner_magenta_leak"], "leak_ok": cut["leak_ok"],
           "bbox_w_permille": cut["bbox_w_permille"], "bbox_h_permille": cut["bbox_h_permille"],
           "center_offset_permille": cut["center_offset_permille"], "size_ok": cut["size_ok"],
           "center_ok": cut["center_ok"], "line_points_px": meds, "line_px": line,
           "line_band": [lo, hi], "line_ok": line is not None and lo <= line <= hi, "line_hex": hexes,
           "normalize": norm, "line_px_after_normalize": None if line is None else line * norm["scale_permille"] // 1000}
    CHK.mkdir(parents=True, exist_ok=True)
    im = Image.open(final)
    view = on_checker(im, 640)
    view.paste(on_checker(im, 160), (640 - 160, 640 - 160))
    view.save(CHK / f"{cid}_view.png")
    (CHK / f"{cid}.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding="utf-8")
    return rep


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids", nargs="+", required=True)
    a = ap.parse_args()
    allp = CHK / "検査_自動.json"
    CHK.mkdir(parents=True, exist_ok=True)
    data = json.loads(allp.read_text(encoding="utf-8")) if allp.exists() else {}
    for cid in a.ids:
        rep = check(cid)
        data[cid] = rep
        print(json.dumps(rep, ensure_ascii=False))
    allp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
