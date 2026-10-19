# -*- coding: utf-8 -*-
"""costlog.py - 生成記録.csv の読み書きと、費用の上限（5,000円で停止）の判定

ウーパーちゃんでは記録を呼び出し側（gen_master.py 等）が書いていたが、チーズでは API を呼ぶ唯一の場所
（gen_panel.py）で1回ごとに必ず書く。上限の判定も同じ場所で行うので、どの道具から呼んでも止まる。

2026-10-17 変更（d了承・decision-log 10/17）：**API を呼ぶ前に「開始」の行を書き、終わったら同じ行の結果を書き換える**。
- 第1便で r13 の1回目が記録に残らなかった（記録の前にプロセスが止まった）ことへの対策
- 開始の行は見込みを満額で持つ（課金されたか分からない呼び出しも費用に数える＝安全側）
- 終わったら finish() が同じ呼び出しIDの行を探して、結果・トークン・見込み（例外なら上乗せ分だけ）に書き換える
- プロセスが止まると「開始」のまま残る＝結果不明の呼び出しとして数えられ、見つけられる
"""
import csv
import datetime as dt
import os
import uuid

import config as C

HEADER = ["日時", "区分", "キー", "ファイル", "モデル", "解像度", "何回目", "見込み(1/10000USD)",
          "入力トークン", "出力トークン", "思考トークン", "結果", "呼び出しID"]
EST_COL = "見込み(1/10000USD)"


def _read():
    if not C.LOG_CSV.exists():
        return []
    with C.LOG_CSV.open(encoding="utf-8-sig", newline="") as f:
        return [dict(r) for r in csv.DictReader(f)]


def _write(rows):
    tmp = C.LOG_CSV.with_name(C.LOG_CSV.name + ".tmp")
    with tmp.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=HEADER, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({k: (r.get(k) or "") for k in HEADER})
    os.replace(tmp, C.LOG_CSV)


def spent_x10000():
    """記録済みの見込みの合計（1/10,000 USD の整数）。「開始」のまま残った行も数える。記録が無ければ 0"""
    total = 0
    for row in _read():
        v = (row.get(EST_COL) or "").strip()
        if v.isdigit():
            total += int(v)
    return total


def check_cap(planned_x10000):
    """今回の分を足すと停止ラインを超えるか。(超えるか, 累計の円, 足した後の円) を返す"""
    before = spent_x10000()
    after = before + planned_x10000
    return C.yen_of(after) > C.STOP_YEN, C.yen_of(before), C.yen_of(after)


def start(kind, key, out, model, size, attempt, est):
    """API を呼ぶ前に「開始」の行を書く。呼び出しIDを返す"""
    C.LOG_CSV.parent.mkdir(parents=True, exist_ok=True)
    cid = uuid.uuid4().hex[:12]
    rows = _read()
    rows.append({"日時": dt.datetime.now().strftime("%Y-%m-%d %H:%M"), "区分": kind, "キー": key,
                 "ファイル": str(out), "モデル": model, "解像度": size, "何回目": attempt,
                 EST_COL: str(est), "結果": "開始", "呼び出しID": cid})
    _write(rows)
    return cid


def finish(cid, est, usage, result):
    """開始の行を結果で書き換える。行が見つからなければ（手で消された等）新しい行として足す"""
    rows = _read()
    for r in rows:
        if r.get("呼び出しID") == cid:
            r[EST_COL] = str(est)
            r["入力トークン"] = str(usage.get("total_input_tokens", ""))
            r["出力トークン"] = str(usage.get("total_output_tokens", ""))
            r["思考トークン"] = str(usage.get("total_thought_tokens", ""))
            r["結果"] = result
            break
    else:
        rows.append({"日時": dt.datetime.now().strftime("%Y-%m-%d %H:%M"), EST_COL: str(est),
                     "結果": result + "（開始行なし）", "呼び出しID": cid})
    _write(rows)


def append(kind, key, out, model, size, attempt, est, usage, result):
    """旧形式（1回で1行）。互換のため残す"""
    cid = start(kind, key, out, model, size, attempt, est)
    finish(cid, est, usage, result)
