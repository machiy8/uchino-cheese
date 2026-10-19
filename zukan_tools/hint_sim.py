# -*- coding: utf-8 -*-
"""ヒント設計 v1 の到達見積り（日単位のシミュレーション）

使い方（リポジトリの zukan_tools/ で。2026-10-19 work/ から移設）:
  python -I hint_sim.py                          # 3つの遊び方 × 開始日2つ × 乱数30通りの要約
  python -I hint_sim.py --profile standard --start 2027-04-01 --seeds 30 --per-card   # カード別の登録日（中央値）

モデル（ヒント設計_v1.md §6 に同じ説明）:
- 1日に決まった時刻だけ開く（standard: 7:30/12:30/21:00、relaxed: 7:30/21:00、eager: standard＋広告ヒント2）
- 初日の最初のログインでチュートリアル：クリームチーズのレシピを全部見せ、30分で作る（=最初の相棒）
- はじめてのレシピ帳：2日目〜8日目の最初のログインで、残り7タイプの入門カードを1日1枚、レシピ全部を見せる（common.starter_cards）
- ひらめき（相棒のヒント）はその日最初のログインでまとめて受け取る。数はなつき度Lvで決まる
- ヒントは「ねらいのカード」の次の穴を開ける。ねらい＝未登録の実在種のうち、仕上げが解放済み→残りの穴が少ない→熟成が短い→Noが小さい順
- タイプを初めて登録したら「タイプのきほん」で同タイプ全カードの共通の穴が埋まる。実在種を新しく登録するたびに同タイプの1枚の穴が1つ開く（なかまのヒント）
- 失敗種・工房オリジナルを初めて出したら、ねらいのカードの穴が1つ開く
- 7つの穴が全部開いたカードだけを仕込む（確実ルート＝1回で成功）。空いた熟成棚では「ためし」（乱数のレシピ・12時間か1日）を回す（失敗種・工房オリジナル17種を全部見つけたら止める）
- 取り出しは「窓」に入った最初のログイン。30分のものはその場で待つ。窓に入るログインが無いものは作らない
- 熟成の短縮は仕込んだ時点のLvで固定（相棒仕様 v2 §3）
"""
import os, sys, argparse, random, statistics, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa
sys.stdout.reconfigure(encoding="utf-8")  # -I では PYTHONIOENCODING が効かないため

PROFILES = {
    "relaxed":  {"checkins": [450, 1260], "aff": 30, "ads": 0, "label": "ゆったり（1日2回・なつき30/日）"},
    "standard": {"checkins": [450, 750, 1260], "aff": 50, "ads": 0, "label": "標準（1日3回・なつき50/日）"},
    "eager":    {"checkins": [450, 750, 1260], "aff": 90, "ads": AD_HINTS_PER_DAY, "label": "熱心（1日3回・なつき90/日・広告ヒント2/日）"},
}
SECRET_TOTAL = len(data.FAIL) + len(data.ORIG)
TRIAL_TIMES = ["T2", "T3", "T4"]               # ためしの取り出し時間（乱数）
TRIAL_TIMES_LATE = ["T2", "T3", "T4", "T5", "T6"]  # 図鑑30種以上（ひみつのカードの文が見える）から


def harvest_time(start, tk, boost, checkins, horizon_days=40):
    th = short_th(boost)
    i = TIME_KEYS.index(tk)
    lo = start + th[tk]
    hi = start + th[TIME_KEYS[i + 1]] if i + 1 < len(TIME_KEYS) else None
    if tk == "T1":
        return lo  # その場で待つ
    d0 = start // 1440
    for d in range(d0, d0 + horizon_days):
        for t in checkins:
            x = d * 1440 + t
            if x >= lo and (hi is None or x < hi):
                return x
    return None


HPD = dict(HINTS_PER_DAY_BY_LV)
SLOTS_N = [AGING_SLOTS]
USE_STARTER = [True]


def run(profile, start_date, seed, max_days=500, record=False):
    P = PROFILES[profile]
    rng = random.Random(seed)
    cards = build_cards()
    byno = {c.no: c for c in cards}
    tc = type_common(cards)
    known = {c.no: set() for c in cards}
    registered_real = {}      # no -> day
    first_hint_day = {}
    secret_found = set()
    reg_total = 0
    types_done = set()
    aff = 0
    jobs = []                 # dict(kind, no/inputs, start, harvest)
    hints_used = 0
    hints_wasted = 0
    trials = 0

    def date_of(minute):
        return start_date + datetime.timedelta(days=minute // 1440)

    def fin_ok(c):
        return FIN_UNLOCK[c.recipe["finish"]] <= reg_total

    def give_hint(day, prefer_type=None, exclude=None):
        nonlocal hints_used, hints_wasted
        cand = [c for c in cards if c.no not in registered_real and len(known[c.no]) < 7
                and (prefer_type is None or c.type == prefer_type) and c.no != exclude
                and not any(j.get("no") == c.no for j in jobs)]
        if not cand:
            if prefer_type is None and not all(n in registered_real for n in yr_nos):
                hints_wasted += 1
            return False
        cand.sort(key=lambda c: (0 if fin_ok(c) else 1, 7 - len(known[c.no]), TH_MIN[c.recipe["time"]], c.no))
        c = cand[0]
        for sl in SLOTS:
            if sl not in known[c.no]:
                known[c.no].add(sl)
                break
        first_hint_day.setdefault(c.no, day)
        hints_used += 1
        return True

    def register(res, day, minute):
        nonlocal reg_total
        kind = res[0]
        if kind == "real":
            no = res[1]
            if no in registered_real:
                return
            registered_real[no] = day
            reg_total += 1
            c = byno[no]
            known[no] = set(SLOTS)
            if c.type not in types_done:
                types_done.add(c.type)
                for x in cards:
                    if x.type == c.type:
                        known[x.no] |= set(tc[c.type].keys())
            give_hint(day, prefer_type=c.type, exclude=no)
        else:
            key = (kind, res[1])
            if key in secret_found:
                return
            secret_found.add(key)
            reg_total += 1
            give_hint(day)

    yr_nos = [c.no for c in cards if not c.season]
    starters = starter_cards(cards) if USE_STARTER[0] else []
    # チュートリアル
    tut = byno[1]
    known[1] = set(SLOTS)

    for day in range(max_days):
        first = True
        for t in P["checkins"]:
            now = day * 1440 + t
            # 1. 取り出し
            for j in sorted([j for j in jobs if j["harvest"] <= now], key=lambda j: j["harvest"]):
                jobs.remove(j)
                hd = date_of(j["harvest"])
                if j["kind"] == "plan":
                    c = byno[j["no"]]
                    res = judge(*c.key(), hd, cards)
                else:
                    res = judge(*j["inputs"], hd, cards)
                register(res, day, j["harvest"])
            # 2. その日最初のログイン：なつき度とひらめき
            if first:
                first = False
                aff += P["aff"]
                lv = level_of(aff)
                if 1 <= day <= len(starters):   # はじめてのレシピ帳（2日目〜）
                    sc = starters[day - 1]
                    if sc.no not in registered_real:
                        known[sc.no] = set(SLOTS)
                        first_hint_day.setdefault(sc.no, day)
                for _ in range(HPD[lv] + P["ads"]):
                    give_hint(day)
            lv = level_of(aff)
            boost = BOOST_BY_LV[lv]
            # 3. 仕込み（30分ものはその場で取り出すので、ループで繰り返す）
            for _ in range(10):
                free = SLOTS_N[0] - len(jobs)
                if free <= 0:
                    break
                ready = []
                for c in cards:
                    if c.no in registered_real or len(known[c.no]) < 7 or not fin_ok(c):
                        continue
                    if any(j.get("no") == c.no for j in jobs):
                        continue
                    h = harvest_time(now, c.recipe["time"], boost, P["checkins"])
                    if h is None or not in_season(c.season, date_of(h)):
                        continue
                    ready.append((c, h))
                if ready:
                    ready.sort(key=lambda x: (-TH_MIN[x[0].recipe["time"]], x[0].no))
                    c, h = ready[0]
                    jobs.append({"kind": "plan", "no": c.no, "start": now, "harvest": h})
                elif len(secret_found) < SECRET_TOTAL:
                    fins = [f for f in data.FIN if FIN_UNLOCK[f] <= reg_total]
                    tk = rng.choice(TRIAL_TIMES_LATE if reg_total >= 30 else TRIAL_TIMES)
                    h = harvest_time(now, tk, boost, P["checkins"])
                    if h is None:
                        tk = "T4"
                        h = harvest_time(now, tk, boost, P["checkins"])
                    inp = (rng.choice(data.MILK), rng.choice(data.BAC), rng.choice(data.PRESS),
                           rng.choice(data.ROOM), tk, rng.choice(data.CARE), rng.choice(fins))
                    jobs.append({"kind": "trial", "inputs": inp, "start": now, "harvest": h})
                    trials += 1
                    break
                else:
                    break
                # 30分もの：その場で取り出す
                for j in [j for j in jobs if j["harvest"] <= now + 30 and j["kind"] == "plan" and byno[j["no"]].recipe["time"] == "T1"]:
                    jobs.remove(j)
                    res = judge(*byno[j["no"]].key(), date_of(j["harvest"]), cards)
                    register(res, day, j["harvest"])
        yr = [c.no for c in cards if not c.season]
        if all(n in registered_real for n in yr) and all(n in registered_real for n in byno) and len(secret_found) == SECRET_TOTAL:
            break
    yr = [c.no for c in cards if not c.season]
    out = {
        "day_year_round_done": max(registered_real.get(n, 10**6) for n in yr),
        "day_all65": max(registered_real.get(n, 10**6) for n in byno),
        "real_by_day7": sum(1 for d in registered_real.values() if d < 7),
        "real_by_day30": sum(1 for d in registered_real.values() if d < 30),
        "secret_found": len(secret_found),
        "hints_used": hints_used, "hints_wasted": hints_wasted, "trials": trials,
        "lv_final": level_of(aff),
        "reg_day": dict(registered_real), "first_hint_day": dict(first_hint_day),
    }
    return out


def fmt(v):
    return "未達" if v >= 10**6 else str(v + 1)  # 1日目＝day0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--profile", default="")
    ap.add_argument("--start", default="")
    ap.add_argument("--seeds", type=int, default=30)
    ap.add_argument("--per-card", action="store_true")
    ap.add_argument("--no-starter", action="store_true", help="はじめてのレシピ帳なしで試算")
    ap.add_argument("--slots", type=int, default=0, help="熟成棚の枠数を上書き（試算用）")
    ap.add_argument("--hpd", default="", help="ひらめき/日をLv1..10の順にカンマ区切りで上書き（試算用）")
    a = ap.parse_args()
    if a.no_starter:
        USE_STARTER[0] = False
    if a.slots:
        SLOTS_N[0] = a.slots
    if a.hpd:
        HPD.update({i + 1: int(x) for i, x in enumerate(a.hpd.split(","))})
    profiles = [a.profile] if a.profile else list(PROFILES)
    starts = [a.start] if a.start else ["2027-04-01", "2026-11-01"]
    print(f"data.py sha256: {data_sha()}")
    print(f"前提：熟成棚{SLOTS_N[0]}枠・ひらめき/日 {HPD}・乱数 {a.seeds}通り（日数は1日目=初日）")
    print("")
    print("| 遊び方 | 開始日 | 7日目までの実在種 | 30日目までの実在種 | 通年62種コンプ（日目） | 季節3種を含む65種（日目） | 失敗・工房17種 | 使ったヒント | 余ったヒント | ためし回数 |")
    print("|---|---|---|---|---|---|---|---|---|---|")
    for p in profiles:
        for s in starts:
            sd = datetime.date.fromisoformat(s)
            rs = [run(p, sd, seed) for seed in range(a.seeds)]

            def med(k):
                return statistics.median(r[k] for r in rs)

            def rng_(k, f=lambda x: x):
                xs = sorted(r[k] for r in rs)
                return f"{f(xs[len(xs)//2])}（{f(xs[0])}〜{f(xs[-1])}）"
            print(f"| {PROFILES[p]['label']} | {s} | {rng_('real_by_day7')} | {rng_('real_by_day30')} | "
                  f"{rng_('day_year_round_done', fmt)} | {rng_('day_all65', fmt)} | {rng_('secret_found')} | "
                  f"{int(med('hints_used'))} | {int(med('hints_wasted'))} | {int(med('trials'))} |")
            if a.per_card:
                cards = build_cards()
                print("")
                print(f"#### カード別（{PROFILES[p]['label']}・開始 {s}・中央値）")
                print("| No | チーズ | 熟成 | 最初のヒント（日目） | 登録（日目） | ねらってから登録まで（日） |")
                print("|---|---|---|---|---|---|")
                for c in cards:
                    regs = sorted(r["reg_day"].get(c.no, 10**6) for r in rs)
                    fh = sorted(r["first_hint_day"].get(c.no, regs[i] if regs[i] < 10**6 else 10**6) for i, r in enumerate(rs))
                    gap = sorted((r["reg_day"].get(c.no, 10**6) - r["first_hint_day"].get(c.no, r["reg_day"].get(c.no, 10**6))) for r in rs)
                    m = len(rs) // 2
                    g = gap[m]
                    print(f"| {c.no} | {c.name} | {data.TIME_LABEL[c.recipe['time']]} | {fmt(fh[m])} | {fmt(regs[m])} | {'未達' if g > 10**5 or g < -10**5 else g} |")
                print("")


if __name__ == "__main__":
    main()
