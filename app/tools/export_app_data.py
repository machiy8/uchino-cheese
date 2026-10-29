# -*- coding: utf-8 -*-
"""export_app_data.py - 図鑑データの正本（zukan_tools/data.py）からアプリに同梱する JSON とテスト用の答えを書き出す

正本の手順：docs/実装計画_Phase1.md §2-2・§2-3 の手順1〜2・§5（判定・失敗条件の宣言形・熟成短縮の計算）。

使い方（リポジトリ直下で。Python 3・標準ライブラリだけ）：
  python -I app/tools/export_app_data.py --zukan zukan_tools --art art_tools --ng docs/specs/ng_words_v1.txt --out app/src/data/generated

書き出すもの：
  <out>/species.json     82種（実在65・失敗9・工房8）。失敗種の条件は宣言形、工房のタイプ推定は上から順の表
  <out>/hints.json       zukan_tools/out/hints.json（中身が data.py から作り直したものと同じことを確かめてから）
  <out>/game_params.json common.py の数値（しきい値・なつき度・ひらめき・熟成棚・仕上げの解放・はじめてのレシピ帳の順）
                         と、buddy の下に相棒の数値（common.py の BUDDY_*。None が残っていたら止まる）
  <out>/ng_words.json    NG語辞書の行頭の印（* 部分一致／= 完全一致／なし＝長さで決める）を解釈した配列
  <golden>/judge_<MMDD>.bin  §5 の16日付。全入力87,360通りの判定結果（種の No を1バイトずつ）
  <golden>/boost_table.json  熟成短縮 7段階×5（0・3・5・7・10%）＝35個
  顔（--art。処理は export_faces.py と同じ。図鑑の82種と ID・名前を突き合わせてから）：
  <out>/face_style.json・<out>/faces.json・<golden>/face_shapes.json（8型×11表情＝88通りの図形の答え）
  （<golden> の既定は <out> から見た ../../../tests/golden ＝ app/tests/golden）

止まる条件（1つでも当たれば何も書かずに終わる）：
  - 失敗種の宣言形・タイプ推定の表が、87,360通りのどれかで data.py の lambda／infer_type と違う
  - zukan_tools/out/hints.json の中身が、いまの data.py から作り直したものと違う（ローカルで hint_gen.py を回す）
  - 前回の species.json と比べて、既存IDの名前が変わった・既存IDが消えた（種の番号は変えない：相棒v2 §10-2）
  - 顔の書き出しの止まる条件（export_faces.py の説明を見る）

入力の並び（判定の答えのバイト位置）：乳4×菌5×圧搾4×庫2×時間7×手入れ6×仕上げ13 の順で、仕上げがいちばん速く回る
（common.all_inputs と同じ）。値の並びは game_params.json の domains。
元の sha256：species.json の sourceSha256 に data.py・common.py の sha256 を入れる。アプリのテスト（tests/generated.test.ts）が
今の実ファイルと比べ、違えば「export_app_data.py を回し直す」と出して落ちる。sha はバイト列で取るので、
改行は .gitattributes で LF にそろえている（Windows の autocrlf でも変わらない）。
日時：species.json・hints.json の exportedAt は、中身が前回と同じなら前回の値のまま（何度書き出しても差分が出ない）。
"""
import argparse
import datetime
import hashlib
import importlib
import importlib.util
import itertools
import json
import os
import sys
import tempfile
import unicodedata
from pathlib import Path

SLOTS = ["milk", "bac", "press", "room", "time", "care", "finish"]

# §5 の16日付（季節の内外がそろう4日＋季節の境目12日）。年は判定に関係しない（月日だけで見る）
GOLDEN_DATES = [(1, 15), (5, 1), (7, 15), (11, 20),
                (4, 14), (4, 15), (5, 10), (5, 11), (5, 31), (6, 1),
                (9, 9), (9, 10), (10, 31), (11, 1), (11, 15), (11, 16)]

# ---- 失敗種の条件（宣言形）。data.FAIL の lambda と同じ意味になるよう手で書き、下の照合で87,360通りを確かめる
# 書き方：穴の名前 → 値（等しい）／値の配列（どれか）／{"not": [値…]}（どれでもない）。穴どうしは「かつ」
FAIL_WHEN = {
    "F1": {"bac": "青カビ", "care": {"not": ["針"]}},
    "F2": {"bac": "ウォッシュ菌", "care": {"not": ["洗う", "塩"]}},
    "F3": {"bac": ["白カビ", "青カビ", "ウォッシュ菌"], "room": "からっと"},
    "F4": {"bac": "白カビ", "time": ["T6", "T7"]},
    "F5": {"bac": "穴あき菌", "press": [0, 1, 2]},
    "F6": {"care": "練る", "press": [2, 3]},
    "F7": {"finish": "燻製", "time": ["T1", "T2"]},
    "F8": {"bac": "なし", "press": 3, "room": "しっとり", "care": {"not": ["塩"]}},
    "F9": {"bac": "なし", "press": 0, "room": "しっとり", "time": ["T5", "T6", "T7"],
           "milk": {"not": ["山羊"]}, "care": {"not": ["練る"]}},
}

# ---- 工房のタイプ推定（data.infer_type と同じ。上から順に見て最初に当たった行。最後の行は条件なし）
# infer_type の「p==3 or t in (T6,T7)」は「かつ」で書けないので2行に分けた（順番に見るので同じ意味）
INFER_TYPE = [
    ({"care": "練る"}, "パスタフィラータ"),
    ({"bac": "白カビ"}, "白カビ"),
    ({"bac": "青カビ"}, "青カビ"),
    ({"bac": "ウォッシュ菌"}, "ウォッシュ"),
    ({"bac": "穴あき菌"}, "ハード"),
    ({"milk": "山羊"}, "シェーブル"),
    ({"press": 0}, "フレッシュ"),
    ({"press": 3}, "ハード"),
    ({"time": ["T6", "T7"]}, "ハード"),
    ({}, "セミハード"),
]


class Stop(Exception):
    pass


def match_when(when, inp):
    for sl, cond in when.items():
        v = inp[sl]
        if isinstance(cond, dict):
            if v in cond["not"]:
                return False
        elif isinstance(cond, list):
            if v not in cond:
                return False
        elif v != cond:
            return False
    return True


def check_when_shape(when, domains, where):
    """穴の名前・値が data.py の選択肢にあるか（打ち間違いで「どれにも当たらない」条件になるのを防ぐ）"""
    for sl, cond in when.items():
        if sl not in domains:
            raise Stop(f"{where}：穴の名前が違う {sl}")
        vals = cond["not"] if isinstance(cond, dict) else cond if isinstance(cond, list) else [cond]
        if isinstance(cond, dict) and set(cond) != {"not"}:
            raise Stop(f"{where}：{sl} の書き方が違う {cond}")
        for v in vals:
            if v not in domains[sl]:
                raise Stop(f"{where}：{sl} に無い値 {v!r}")


def verify_declarative(data, domains):
    """87,360通りすべてで、宣言形の失敗条件と data.FAIL の lambda、宣言形のタイプ推定と infer_type を比べる"""
    fids = [x[0] for x in data.FAIL]
    if sorted(fids) != sorted(FAIL_WHEN):
        raise Stop(f"失敗種の宣言形の表と data.FAIL の ID が合わない：data={fids} 表={sorted(FAIL_WHEN)}")
    for fid, when in FAIL_WHEN.items():
        check_when_shape(when, domains, f"失敗種 {fid}")
    for when, typ in INFER_TYPE:
        check_when_shape(when, domains, f"タイプ推定 {typ}")
        if typ not in data.ORIG:
            raise Stop(f"タイプ推定：data.ORIG に無いタイプ {typ}")
    if INFER_TYPE[-1][0]:
        raise Stop("タイプ推定の最後の行は条件なしにする")

    n = 0
    diffs = []
    for k in itertools.product(*(domains[sl] for sl in SLOTS)):
        n += 1
        inp = dict(zip(SLOTS, k))
        for fid, _name, _cond, rule, *_ in data.FAIL:
            a = bool(rule(*k))
            b = match_when(FAIL_WHEN[fid], inp)
            if a != b:
                diffs.append(f"失敗 {fid} {k} lambda={a} 宣言形={b}")
        t1 = data.infer_type(*k)
        t2 = next(typ for when, typ in INFER_TYPE if match_when(when, inp))
        if t1 != t2:
            diffs.append(f"タイプ推定 {k} infer_type={t1} 表={t2}")
        if len(diffs) >= 20:
            break
    if diffs:
        raise Stop("宣言形と data.py が違う（最初の20件まで）：\n  " + "\n  ".join(diffs))
    return n


def season_obj(win):
    if win is None:
        return None
    (a, b), (c, d) = win
    return {"from": {"month": a, "day": b}, "to": {"month": c, "day": d}}


def build_species(common, data):
    cards = common.build_cards()
    others = common.build_others(len(cards))
    out = []
    for c in cards:
        out.append({
            "id": c.id, "no": c.no, "kind": "real", "name": c.name,
            "origin": c.origin, "type": common.TYPE_ID[c.type], "rare": c.rare,
            "expl": c.expl, "persona": c.persona,
            "season": season_obj(c.season), "seasonText": c.season_text or None,
            "recipe": c.recipe,
            "detail": data.DETAIL.get(c.name),
        })
    orig_type = {v[0]: t for t, v in data.ORIG.items()}
    fail_iter = iter(data.FAIL)
    for no, sid, name, kind, cond, ex in others:
        if kind == "失敗種":
            fid, fname, fcond, _rule, fex, per, _src = next(fail_iter)
            assert fname == name
            out.append({
                "id": sid, "no": no, "kind": "fail", "name": name, "failId": fid,
                "condText": fcond, "expl": fex, "persona": per,
                "when": FAIL_WHEN[fid],
                "detail": data.DETAIL.get(name),
            })
        else:
            typ = orig_type[name]
            out.append({
                "id": sid, "no": no, "kind": "orig", "name": name,
                "type": common.TYPE_ID[typ], "persona": data.ORIG[typ][1],
                "detail": data.DETAIL.get(name),
            })
    # 宣言形のタイプ推定は種の ID で持つ（アプリは結果の ID をそのまま使える）
    orig_id = {s["type"]: s["id"] for s in out if s["kind"] == "orig"}
    infer = [{"when": when, "type": common.TYPE_ID[typ], "id": orig_id[common.TYPE_ID[typ]]}
             for when, typ in INFER_TYPE]
    return cards, out, infer


BUDDY_PREFIX = "BUDDY_"


def null_paths(obj, path=""):
    """値が None（＝d 裁定待ち）の場所を "OPS.care.prefBonus.mood" の形で並べる"""
    if obj is None:
        return [path]
    if isinstance(obj, dict):
        return [p for k, v in obj.items() for p in null_paths(v, f"{path}.{k}" if path else k)]
    return []


def build_buddy(common):
    """common.py の BUDDY_* をそのまま（名前から BUDDY_ を外して）載せる。
    None（d 裁定待ち）が1つでも残っていたら止まる（2026-10-30 d裁定で全部埋めた）"""
    names = [n for n in vars(common) if n.startswith(BUDDY_PREFIX) and n.isupper()]
    if not names:
        raise Stop("common.py に BUDDY_* の定数が無い")
    buddy = {"source": "docs/specs/相棒チーズ_仕様_v2.md §1・§2・§6・§10-4"}
    for n in names:  # 定義した順（vars は定義順）
        buddy[n[len(BUDDY_PREFIX):]] = getattr(common, n)
    buddy["types"] = [common.TYPE_ID[t] for t in common.TYPES] + ["fail", "orig"]
    for key in ("TEMP_PREF", "CARE_PREF"):
        if sorted(buddy[key]) != sorted(buddy["types"]):
            raise Stop(f"BUDDY_{key} のキーがタイプ8つ＋fail＋orig と合わない：{sorted(buddy[key])}")
    for key, vals in (("TEMP_PREF", {"cool", "sun"}), ("CARE_PREF", {"wipe", "turn"})):
        bad = {k: v for k, v in buddy[key].items() if v not in vals | {common.BUDDY_PREF_INFER}}
        if bad:
            raise Stop(f"BUDDY_{key} に無い値：{bad}")
    pending = null_paths({k: v for k, v in buddy.items() if k != "source"})
    if pending:
        raise Stop("BUDDY_* に None（d 裁定待ち）が残っている：" + "・".join(pending))
    return buddy


def make_golden(common, cards, species):
    """16日付 × 87,360通りの判定（1バイト＝種の No）。判定は common.judge そのもの
    （実在の完全一致→失敗ルール→工房）。結果の形がまちまち（失敗は F1 などの ID）なので名前から No に直す"""
    name_to_no = {s["name"]: s["no"] for s in species}
    if max(name_to_no.values()) > 255:
        raise Stop("種の No が1バイトに入らない")
    by_key = {}
    for c in cards:
        by_key.setdefault(c.key(), []).append(c)
    inputs = list(common.all_inputs())
    res = {}
    for (mo, da) in GOLDEN_DATES:
        md = datetime.date(2001, mo, da)  # 平年。2/29 は使わない
        buf = bytearray()
        for k in inputs:
            kind, x, name = common.judge(*k, md, by_key.get(k, []))
            buf.append(x if kind == "real" else name_to_no[name])
        res[f"{mo:02d}{da:02d}"] = bytes(buf)
    return res


def make_boost(common):
    pcts = sorted(set(common.BOOST_BY_LV.values()))
    rows = []
    for k in common.TIME_KEYS:
        for p in pcts:
            rows.append({"time": k, "boostPct": p, "minutes": common.short_th(p)[k]})
    return {"rule": "短縮後のしきい値（分）＝ TH_MIN×(100−短縮%) // 100（分未満切り捨て・整数演算）",
            "pcts": pcts, "table": rows}


def load_hints(zukan, common, sha):
    """zukan_tools/out/hints.json を、いまの data.py から hint_gen.py で作り直したものと比べる。
    generatedAt・dataSha256 以外が同じなら、dataSha256 をいまの data.py の sha に直して使う"""
    src = zukan / "out" / "hints.json"
    committed = json.loads(src.read_text(encoding="utf-8"))
    hint_gen = importlib.import_module("hint_gen")
    with tempfile.TemporaryDirectory() as td:
        saved = sys.argv, sys.stdout
        sys.argv = ["hint_gen.py", "--out-json", os.path.join(td, "h.json"), "--out-md", os.path.join(td, "h.md")]
        try:
            with open(os.devnull, "w", encoding="utf-8") as devnull:
                sys.stdout = devnull
                hint_gen.main()
        finally:
            sys.argv, sys.stdout = saved
        fresh = json.loads(Path(td, "h.json").read_text(encoding="utf-8"))
    skip = {"generatedAt", "dataSha256"}
    bad = sorted(k for k in set(committed) | set(fresh) if k not in skip and committed.get(k) != fresh.get(k))
    if bad:
        raise Stop(f"{src} の中身がいまの data.py と合わない（{bad}）。ローカルで python -I zukan_tools/hint_gen.py を回して commit してから書き出す")
    note = None
    if committed.get("dataSha256") != sha:
        note = (f"注意：{src} の dataSha256（{committed.get('dataSha256', '')[:12]}…）が data.py（{sha[:12]}…）と違う。"
                "中身は作り直したものと同じなので、いまの sha を入れて書き出した（ローカルで hint_gen.py を回して commit すれば消える）")
    out = dict(committed)
    out["dataSha256"] = sha
    return out, note


# ---- NG語（docs/specs/ng_check.py と同じ正規化・同じ印の解釈）
REMOVE = set("ー・〜♪☆！？!?~～･ｰ")


def ng_norm(s):
    s = unicodedata.normalize("NFKC", s).strip()
    s = "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in s).lower()
    return "".join(c for c in s if c not in REMOVE)


def load_ng(path):
    entries, cat = [], ""
    for raw in Path(path).read_text(encoding="utf-8").splitlines():
        line = raw.split("#", 1)[0].strip()
        if raw.strip().startswith("# ----------"):
            cat = raw.strip().strip("# -").strip()
        if not line:
            continue
        mode = ""
        if line[0] in "*=":
            mode, line = line[0], line[1:].strip()
        n = ng_norm(line)
        if not n:
            raise Stop(f"NG語が正規化で空になる：{raw!r}")
        partial = True if mode == "*" else False if mode == "=" else len(n) >= 3
        entries.append({"word": n, "match": "partial" if partial else "exact", "category": cat})
    return entries


def sha256_file(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def check_ids(prev_path, species):
    """前回の species.json と比べ、既存IDの名前が変わった・既存IDが消えたら止まる"""
    if not prev_path.is_file():
        return None
    prev = json.loads(prev_path.read_text(encoding="utf-8"))
    now = {s["id"]: s["name"] for s in species}
    errs = []
    for s in prev.get("species", []):
        if s["id"] not in now:
            errs.append(f"{s['id']}（{s['name']}）が消えた")
        elif now[s["id"]] != s["name"]:
            errs.append(f"{s['id']} の名前が変わった：{s['name']} → {now[s['id']]}")
    if errs:
        raise Stop("種の番号は公開前に固定し、既存の番号を変えない（相棒v2 §10-2）：\n  " + "\n  ".join(errs))
    return prev


def keep_time(prev, doc, key="exportedAt"):
    """中身が前回と同じなら前回の日時を残す（差分を出さない）"""
    if prev is not None and key in prev:
        a = {k: v for k, v in prev.items() if k != key}
        b = {k: v for k, v in doc.items() if k != key}
        if a == b:
            doc[key] = prev[key]
    return doc


def read_json(p):
    return json.loads(p.read_text(encoding="utf-8")) if p.is_file() else None


def dump(p, obj):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")


def load_export_faces():
    # python -I ではこのフォルダが sys.path に入らないので、ファイルを直接読み込む
    spec = importlib.util.spec_from_file_location("export_faces", Path(__file__).resolve().parent / "export_faces.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--zukan", required=True, help="zukan_tools のフォルダ")
    ap.add_argument("--art", required=True, help="art_tools のフォルダ（顔の数値と図形の答えも書き出す）")
    ap.add_argument("--ng", required=True, help="NG語辞書（ng_words_v1.txt）")
    ap.add_argument("--out", required=True, help="JSON の書き出し先（app/src/data/generated）")
    ap.add_argument("--golden", default=None, help="テスト用の答えの書き出し先（既定：<out>/../../../tests/golden）")
    a = ap.parse_args()

    zukan = Path(a.zukan).resolve()
    out = Path(a.out).resolve()
    golden = Path(a.golden).resolve() if a.golden else (out / ".." / ".." / ".." / "tests" / "golden").resolve()
    sys.path.insert(0, str(zukan))
    common = importlib.import_module("common")
    data = common.data

    sha = sha256_file(zukan / "data.py")
    if sorted(SLOTS) != sorted(common.SLOTS):
        raise Stop(f"穴の名前が common.SLOTS と合わない：{common.SLOTS}")
    domains = {"milk": data.MILK, "bac": data.BAC, "press": data.PRESS, "room": data.ROOM,
               "time": data.TIME, "care": data.CARE, "finish": data.FIN}
    exported_at = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat()

    n = verify_declarative(data, domains)
    print(f"宣言形の照合：{n:,}通り × 失敗{len(data.FAIL)}種＋タイプ推定 → 違い0件")

    cards, species, infer = build_species(common, data)
    if len(species) != 82:
        raise Stop(f"種の数が82でない：{len(species)}")
    prev_species = check_ids(out / "species.json", species)

    species_doc = keep_time(prev_species, {
        "source": "zukan_tools/data.py（common.build_cards・build_others 経由）",
        "dataSha256": sha,
        # 書き出しの元にしたファイルの sha256（リポジトリ直下からのパス）。アプリのテストが今の実ファイルと照合し、
        # 書き出し直さないまま data.py・common.py を直したら落ちる（judge_*.bin・boost_table.json も同じ回で書く）
        "sourceSha256": {"zukan_tools/data.py": sha, "zukan_tools/common.py": sha256_file(zukan / "common.py")},
        "exportedAt": exported_at,
        "inputOrder": SLOTS,
        "inferType": infer,
        "species": species,
    })

    hints, note = load_hints(zukan, common, sha)
    prev_hints = read_json(out / "hints.json")
    hints["exportedAt"] = exported_at
    hints = keep_time(prev_hints, hints)

    starters = common.starter_cards(cards)
    params = {
        "source": "zukan_tools/common.py",
        "types": [{"id": common.TYPE_ID[t], "ja": t} for t in common.TYPES],
        "inputOrder": SLOTS,
        "slotsHintOrder": common.SLOTS,
        "slotJa": common.SLOT_JA,
        "domains": domains,
        "timeKeys": common.TIME_KEYS,
        "timeLabel": data.TIME_LABEL,
        "TH_MIN": common.TH_MIN,
        "LV_TH": common.LV_TH,
        "BOOST_BY_LV": {str(k): v for k, v in common.BOOST_BY_LV.items()},
        "HINTS_PER_DAY_BY_LV": {str(k): v for k, v in common.HINTS_PER_DAY_BY_LV.items()},
        "AD_HINTS_PER_DAY": common.AD_HINTS_PER_DAY,
        "AGING_SLOTS": common.AGING_SLOTS,
        "FIN_UNLOCK": common.FIN_UNLOCK,
        "starterCards": [c.id for c in starters],
        "tutorialCard": cards[0].id,
        "buddy": build_buddy(common),
    }
    if cards[0].name != "クリームチーズ":
        raise Stop(f"チュートリアルのカード（No.1）がクリームチーズでない：{cards[0].name}")

    ng = {"source": Path(a.ng).name, "sourceSha256": sha256_file(a.ng),
          "normalize": "NFKC → カタカナをひらがなへ → 英字は小文字 → 「ー・〜♪☆！？!?~～･ｰ」を除く",
          "words": load_ng(a.ng)}

    gold = make_golden(common, cards, species)
    boost = make_boost(common)
    if len(boost["table"]) != 35:
        raise Stop(f"短縮表が35個でない：{len(boost['table'])}")

    EF = load_export_faces()
    try:
        face_outs, face_summary = EF.build_outputs(a.art, species, out=out, golden=golden)
    except EF.Stop as e:
        raise Stop(str(e))

    # ---- ここまで止まらなければ書く
    dump(out / "species.json", species_doc)
    dump(out / "hints.json", hints)
    dump(out / "game_params.json", params)
    dump(out / "ng_words.json", ng)
    golden.mkdir(parents=True, exist_ok=True)
    for md, b in gold.items():
        (golden / f"judge_{md}.bin").write_bytes(b)
    dump(golden / "boost_table.json", boost)
    EF.write_outputs(face_outs)

    print(f"data.py sha256：{sha}")
    print(f"species.json：{len(species)}種（実在{sum(s['kind'] == 'real' for s in species)}・"
          f"失敗{sum(s['kind'] == 'fail' for s in species)}・工房{sum(s['kind'] == 'orig' for s in species)}）")
    print(f"ng_words.json：{len(ng['words'])}語")
    print(f"golden：judge_*.bin {len(gold)}日付 × {len(next(iter(gold.values()))):,}バイト・boost_table.json {len(boost['table'])}個 → {golden}")
    print(face_summary)
    if note:
        print(note)


if __name__ == "__main__":
    # -I では PYTHONIOENCODING が効かないため。止まった時の文言（stderr）も Windows で文字化けしないように
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    try:
        main()
    except Stop as e:
        print("止まりました：" + str(e), file=sys.stderr)
        sys.exit(1)
