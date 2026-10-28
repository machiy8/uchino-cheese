# -*- coding: utf-8 -*-
"""export_faces.py - 顔の数値と、顔の図形の答え（88通り）をアプリ用に書き出す

ふだんは図鑑データと一緒に書き出す（export_app_data.py --art art_tools がこのファイルの処理も行う）：
  python -I app/tools/export_app_data.py --zukan zukan_tools --art art_tools --ng docs/specs/ng_words_v1.txt --out app/src/data/generated
顔だけを書き出すとき（単独でも動く）。リポジトリ直下から：python -I app/tools/export_faces.py [--check]

書き出すもの
- app/src/data/generated/face_style.json … art_tools/face_style.json の中身そのまま＋ "_export"（元ファイルの sha256）
- app/src/data/generated/faces.json      … art_tools/faces.json（82種の顔の型と位置）そのまま＋ "_export"
- app/tests/golden/face_shapes.json      … face_parts.shapes() の結果（8型×11表情＝88通り）と to_svg() の文字列

値はここでは変えない（正本は art_tools/。変えるのはローカルだけ）。
--check：書き出さずに、今のファイルが正本と同じかだけ確かめる（違えば終了コード1）。

止まる条件（1つでも当たれば何も書かずに終わる）
- faces.json の種の数が82でない・faceType が face_style.json に無い・cx/cy/w が正の整数でない・name が無い
- 図鑑（species.json）と顔の ID の集合や名前が違う
- 単独で回したとき：species.json の sourceSha256 に zukan_tools/data.py・common.py の2つのキーがそろっていない、
  または今の実ファイルと違う（図鑑データが古い。先に export_app_data.py を回し直す）
"""
import argparse
import hashlib
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "art_tools"
OUT = ROOT / "app" / "src" / "data" / "generated"
GOLDEN = ROOT / "app" / "tests" / "golden"
# 図鑑の82種（export_app_data.py の書き出し）。顔の ID・名前と突き合わせる
SPECIES_JSON = OUT / "species.json"
# species.json の sourceSha256 に必ずあるキー（どれかが欠けたら鮮度を確かめられないので止める）
SPECIES_SOURCES = ("zukan_tools/data.py", "zukan_tools/common.py")

# 照合に使う線の太さ（顔の幅の千分率）。make_face_types.py の SVG 部品と同じ「顔の幅 w=400‰」のときの値
GOLDEN_FACE_W = 400
SPECIES_COUNT = 82


class Stop(Exception):
    pass


def sha256(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def rel(p):
    return Path(p).resolve().relative_to(ROOT).as_posix()


def load_face_parts(art):
    # python -I では art_tools が sys.path に入らないので、ファイルを直接読み込む（face_parts は math だけを使う）
    spec = importlib.util.spec_from_file_location("face_parts", art / "face_parts.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def line_width(style, face_w):
    """顔の線の太さ（顔の幅の千分率）＝ lineWidthImagePermille × 1000 ÷ w（make_face_types.py と同じ整数の割り算）"""
    return max(1, style["lineWidthImagePermille"] * 1000 // face_w)


def with_export(data, src, extra=None):
    meta = {"note": "app/tools/export_faces.py が書き出した。手で直さない（正本は " + rel(src) + "）",
            "source": rel(src), "sha256": sha256(src)}
    if extra:
        meta.update(extra)
    return {"_export": meta, **data}


def validate(style, faces):
    types = style["types"]
    fs = faces["faces"]
    if len(fs) != SPECIES_COUNT:
        raise Stop(f"faces.json の種の数が {len(fs)}（{SPECIES_COUNT} のはず）")
    for fid, f in fs.items():
        ft = f.get("faceType")
        if ft not in types:
            raise Stop(f"faces.json の {fid} の faceType {ft!r} が face_style.json の types に無い")
        for k in ("cx", "cy", "w"):
            if not isinstance(f.get(k), int) or f[k] <= 0:
                raise Stop(f"faces.json の {fid} の {k} が正の整数でない: {f.get(k)!r}")
        # 名前は図鑑との突き合わせに使うので必須（無いと名前の食い違いを見逃す）
        if not isinstance(f.get("name"), str) or not f["name"]:
            raise Stop(f"faces.json の {fid} に name が無い（art_tools/faces.json に足すのはローカル）")


def num_json(v):
    # 照合の許容差は0.01なので、小数は6桁に丸めて容量を減らす（整数はそのまま）
    return round(v, 6) if isinstance(v, float) else v


def load_species(species_path):
    """単独で回すときの species.json。無い・古い（書き出しの元が今の実ファイルと違う）なら止める"""
    if not species_path.exists():
        raise Stop(f"{rel(species_path)} が無い（先に export_app_data.py で図鑑データを書き出す）")
    doc = json.loads(species_path.read_text(encoding="utf-8"))
    src = doc.get("sourceSha256") or {}
    if not src:
        raise Stop(f"{rel(species_path)} に sourceSha256 が無い。先に export_app_data.py を回し直す")
    missing = [k for k in SPECIES_SOURCES if k not in src]
    if missing:
        raise Stop(f"{rel(species_path)} の sourceSha256 に {'・'.join(missing)} が無い。先に export_app_data.py を回し直す")
    stale = [path for path, want in src.items() if not (ROOT / path).is_file() or sha256(ROOT / path) != want]
    if stale:
        raise Stop(f"{rel(species_path)} が古い（{'・'.join(stale)} が書き出した後に変わっている）。"
                   "先に export_app_data.py を回し直す")
    return doc["species"]


def check_species(faces, species):
    """図鑑（species.json の species）と顔（faces.json）の ID の集合が同じで、名前も同じか。1件でも違えば止める"""
    sp = {s["id"]: s["name"] for s in species}
    fs = faces["faces"]
    errs = []
    missing = sorted(set(sp) - set(fs))
    extra = sorted(set(fs) - set(sp))
    if missing:
        errs.append("faces.json に無い種: " + "・".join(missing))
    if extra:
        errs.append("species.json に無い顔: " + "・".join(extra))
    for fid in sorted(set(sp) & set(fs)):
        name = fs[fid]["name"]
        if name != sp[fid]:
            errs.append(f"{fid} の名前が違う: faces.json「{name}」・species.json「{sp[fid]}」")
    if errs:
        raise Stop("図鑑と顔が食い違う（art_tools/faces.json か zukan_tools/data.py を直すのはローカル）\n" + "\n".join(errs))


def item_json(it):
    path = [[c[0]] + [num_json(v) for v in c[1:]] for c in it[1]]
    if it[0] == "fill":
        return {"kind": "fill", "path": path, "color": it[2], "alpha": it[3]}
    return {"kind": "stroke", "path": path, "width": num_json(it[2]), "color": it[3]}


def build_golden(FP, style, faces, srcs):
    lw = line_width(style, GOLDEN_FACE_W)
    cases = []
    for t in style["types"]:
        for e in FP.EXPRS:
            items = FP.shapes(t, e, style, lw)
            cases.append({"type": t, "expr": e, "lineWidth": lw, "items": [item_json(i) for i in items],
                          "svg": FP.to_svg(items, extra_attr=f' data-type="{t}" data-expr="{e}"')})
    species_lw = {fid: line_width(style, f["w"]) for fid, f in faces["faces"].items()}
    return {
        "_export": {"note": "app/tools/export_faces.py が face_parts.shapes()・to_svg() で作った答え。手で直さない",
                    "sources": {rel(p): sha256(p) for p in srcs},
                    "faceW": GOLDEN_FACE_W, "lineWidth": lw},
        "exprs": list(FP.EXPRS),
        "types": list(style["types"].keys()),
        "cases": cases,
        "speciesLineWidth": species_lw,
    }


def dump(obj):
    return json.dumps(obj, ensure_ascii=False, indent=1) + "\n"


def dump_golden(g):
    """答えは大きいので1通り1行にする（差分を読みやすく・容量を小さく）"""
    one = lambda v: json.dumps(v, ensure_ascii=False, separators=(",", ":"))
    head = {k: v for k, v in g.items() if k != "cases"}
    lines = ["{"] + [f" {one(k)}: {one(v)}," for k, v in head.items()]
    lines.append(' "cases": [')
    lines.append(",\n".join("  " + one(c) for c in g["cases"]))
    lines.append(" ]")
    lines.append("}")
    return "\n".join(lines) + "\n"


def build_outputs(art, species, out=OUT, golden=GOLDEN):
    """書き出す3つのファイル（パス → 中身の文字列）。species＝図鑑の82種（species.json の species）。
    確かめて止まるのはここまで（書くのは write_outputs）。export_app_data.py からも呼ぶ"""
    art = Path(art).resolve()
    src_parts, src_style, src_faces = art / "face_parts.py", art / "face_style.json", art / "faces.json"
    style = json.loads(src_style.read_text(encoding="utf-8"))
    faces = json.loads(src_faces.read_text(encoding="utf-8"))
    validate(style, faces)
    check_species(faces, species)
    FP = load_face_parts(art)
    outs = {
        Path(out) / "face_style.json": dump(with_export(style, src_style)),
        Path(out) / "faces.json": dump(with_export(faces, src_faces)),
        Path(golden) / "face_shapes.json": dump_golden(build_golden(FP, style, faces, (src_parts, src_style, src_faces))),
    }
    summary = (f"顔の図形 {len(style['types']) * len(FP.EXPRS)} 通り（{len(style['types'])}型×{len(FP.EXPRS)}表情）・"
               f"線の太さ {line_width(style, GOLDEN_FACE_W)}（顔の幅 {GOLDEN_FACE_W}‰）・種 {len(faces['faces'])}")
    return outs, summary


def check_outputs(outs):
    """今のファイルが書き出し結果と同じでないものの一覧"""
    return [rel(p) for p, s in outs.items() if not p.exists() or p.read_text(encoding="utf-8") != s]


def write_outputs(outs):
    for p, s in outs.items():
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(s, encoding="utf-8", newline="\n")
        print(f"書き出し: {rel(p)}（{len(s.encode('utf-8')):,} バイト）")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="書き出さずに、今のファイルが正本と同じか確かめる")
    a = ap.parse_args()
    outs, summary = build_outputs(ART, load_species(SPECIES_JSON))
    if a.check:
        bad = check_outputs(outs)
        if bad:
            print("正本と違う（python -I app/tools/export_faces.py で書き出し直す）: " + ", ".join(bad))
            sys.exit(1)
        print(f"OK：書き出し結果は正本と同じ（{summary}）")
        return
    write_outputs(outs)
    print(summary)


if __name__ == "__main__":
    # -I では PYTHONIOENCODING が効かないため。止まった時の文言（stderr）も Windows で文字化けしないように
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    try:
        main()
    except Stop as e:
        print("止まりました：" + str(e), file=sys.stderr)
        sys.exit(1)
