# -*- coding: utf-8 -*-
"""ヒント文の機械生成（うちのチーズ ヒント設計 v1）

使い方（リポジトリの zukan_tools/ で。2026-10-19 work/ から移設）:
  python -I hint_gen.py                     # out/hints.json と out/ヒント文_一覧_v1.md を作る
  python -I hint_gen.py --sample 7,12,36,46,58   # 指定Noの見本を標準出力へ（md）
  python -I hint_gen.py --check             # 判定の総当たりが gen.py §6 と一致するか検算

原則：ヒントは「ゲームのレシピ」だけを言う。現実の製法の断定はしない（△の割り当てを事実として話さない）。
現実の知識は図鑑登録後の一言解説（data.py）で見せる。
"""
import os, sys, json, math, argparse, collections, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa
sys.stdout.reconfigure(encoding="utf-8")  # -I では PYTHONIOENCODING が効かないため

MILK_W = {"牛": "牛", "山羊": "山羊", "羊": "羊", "水牛": "水牛"}
BAC_W = {"白カビ": "白カビ", "青カビ": "青カビ", "ウォッシュ菌": "ウォッシュ菌", "穴あき菌": "穴あき菌"}
PRESS_W = {1: "ぎゅっと1回（軽く）", 2: "ぎゅっと2回（しっかり）", 3: "ぎゅっと3回（温めて強く）"}
CARE_W = {"洗う": "「洗う」", "返す": "「ひっくり返す」", "針": "「針で刺す」", "塩": "「塩をする」"}
FIN_SHAPE = {"ハート型", "ピラミッド型", "四角型"}


def time_phrase(tk):
    i = TIME_KEYS.index(tk)
    lo = data.TIME_LABEL[tk]
    if i == len(TIME_KEYS) - 1:
        return f"{lo}以上たってから"
    hi = data.TIME_LABEL[TIME_KEYS[i + 1]]
    return f"{lo}たってから、{hi}になる前に"


def core(card, slot):
    """1つの穴のヒント（中立の言い方。語尾は「みたい」で終える）"""
    n = card.name
    v = card.recipe[slot]
    if slot == "milk":
        return f"{n}のレシピは、{MILK_W[v]}のミルクから始めるみたい"
    if slot == "bac":
        if v == "なし":
            return f"{n}のレシピは、菌のふりかけを使わないみたい"
        return f"{n}のレシピは、{BAC_W[v]}をふりかけるみたい"
    if slot == "press":
        if v == 0:
            return f"{n}のレシピは、ぎゅっとしないで型で水を切るだけみたい"
        return f"{n}のレシピは、{PRESS_W[v]}みたい"
    if slot == "room":
        return f"{n}のレシピは、{v}した熟成庫で寝かせるみたい"
    if slot == "care":
        if v == "なし":
            return f"{n}のレシピは、熟成中はお手入れしないでそっとしておくみたい"
        if v == "練る":
            return f"{n}のレシピは、仕込みのときにお湯で練って伸ばすみたい"
        return f"{n}のレシピは、熟成中にいちばん多くするお手入れが{CARE_W[v]}みたい"
    if slot == "time":
        return f"{n}のレシピは、{time_phrase(v)}取り出すみたい"
    if slot == "finish":
        if v == "なし":
            return f"{n}のレシピは、仕上げをしないでそのまま取り出すみたい"
        if v in FIN_SHAPE:
            return f"{n}のレシピは、仕上げで{v}にするみたい"
        return f"{n}のレシピは、仕上げに{v}を使うみたい"
    raise KeyError(slot)


# 相棒の口調（タイプ別2通り）。{core} は「…みたい」で終わる
WRAP = {
    "フレッシュ": ["あのね、{core}！", "えっとね…{core}。あってるかな？"],
    "白カビ": ["ねえねえ、{core}よ。ないしょね", "ふわぁ…ゆめで見たの。{core}"],
    "青カビ": ["べ、べつに教えたいわけじゃないけど…{core}だぞ", "…ひとつだけ言っとく。{core}だ"],
    "ウォッシュ": ["いいこと教えてやるよ。{core}だぜ", "聞いてくれよ、{core}なんだ"],
    "シェーブル": ["きょうは気分がいいから教えてあげる。{core}", "ふふ、{core}。たぶんね"],
    "セミハード": ["ご報告です。{core}です", "メモしておきました。{core}です"],
    "ハード": ["若いの、よく聞くんじゃ。{core}じゃよ", "わしの勘じゃがな…{core}じゃ"],
    "パスタフィラータ": ["みてみて！{core}！", "びよーんとひらめいた！{core}！"],
    "失敗種": ["…ぼくなんかが言うのもアレだけど、{core}", "失敗したぼくだからわかるんだ。{core}"],
}
STAGE_PRE = {"newborn": "…ん、ひらめいた。", "young": "", "prime": "", "vintage": ""}


def wrap(buddy_type, text, variant):
    return WRAP[buddy_type][variant % 2].format(core=text)


def variant_of(card, slot):
    return (card.no * 7 + SLOTS.index(slot)) % 2


# 付属のセリフ（ヒント以外の接続部分）
LINES = {
    "lock_suffix": "（でも、まだ持っていない道具だね。図鑑があと{n}種ふえたら使えるよ）",
    "season_suffix": "（{season}のあいだだけ作れるみたい）",
    "type_basics": "{type}のなかまの共通点がわかったよ！図鑑の{type}のレシピに、{slots}を書きこんでおいたね",
    "sibling": "{done}ができたから、なかまの{name}のこともひとつわかったよ",
    "near0_season": "ねらいの{name}のレシピどおり！…でも季節が合っていないみたい。{season}にもう一度ためそう",
    "near1": "ねらいの{name}まで、あと1か所みたい！",
    "near2": "ねらいの{name}まで、あと2か所。いい線いってるよ",
    "near3": "{name}とは、まだちょっと遠いかも",
    "near_free1": "あと1か所で、{type}のなかまの誰かになれそう",
    "near_free2": "あと2か所で、{type}のなかまの誰かになれそう",
    "fail_first": "{fail}って子がうまれたよ。{expl}んだって。この失敗、ねらいの{target}のヒントになったよ",
    "orig_first": "どのレシピにもない、きまぐれな子がうまれたよ（工房オリジナル。実在の銘柄ではありません）",
    "reunion": "待ってるあいだに、{name}のことをひとつ思い出したよ",
}


def fail_card_hint(cond):
    return f"ひみつのレシピ：{cond}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample", default="")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--out-json", default=os.path.join(HERE, "out", "hints.json"))
    ap.add_argument("--out-md", default=os.path.join(HERE, "out", "ヒント文_一覧_v1.md"))
    a = ap.parse_args()

    cards = build_cards()
    others = build_others(len(cards))
    tc = type_common(cards)

    if a.check:
        do_check(cards)
        return
    if a.sample:
        nos = [int(x) for x in a.sample.split(",")]
        print(sample_md(cards, tc, nos))
        return

    # ---- JSON
    js = {
        "generatedAt": datetime.date.today().isoformat(),
        "dataSha256": data_sha(),
        "slotsOrder": SLOTS,
        "slotJa": SLOT_JA,
        "typeCommon": {TYPE_ID[t]: v for t, v in tc.items()},
        "wrap": {k: v for k, v in WRAP.items()},
        "stagePrefix": STAGE_PRE,
        "lines": LINES,
        "finishUnlock": FIN_UNLOCK,
        "cards": [],
        "secretCards": [],
    }
    for c in cards:
        js["cards"].append({
            "id": c.id, "no": c.no, "name": c.name, "type": TYPE_ID[c.type],
            "season": c.season_text or None,
            "recipe": c.recipe,
            "hints": {sl: core(c, sl) for sl in SLOTS},
            "typeCommonSlots": [sl for sl in SLOTS if sl in tc[c.type]],
        })
    for no, oid, name, kind, cond, ex in others:
        js["secretCards"].append({
            "id": oid, "no": no, "name": name, "kind": "fail" if kind == "失敗種" else "original",
            "cardHint": fail_card_hint(cond) if kind == "失敗種" else f"ひみつのレシピ：{cond}っぽいのに、どのレシピにも当てはまらない組み合わせ",
            "explain": ex,
        })
    os.makedirs(os.path.dirname(a.out_json), exist_ok=True)
    with open(a.out_json, "w", encoding="utf-8") as f:
        json.dump(js, f, ensure_ascii=False, indent=1)

    # ---- md 一覧
    L = []
    w = L.append
    w("# うちのチーズ ヒント文 一覧 v1（自動生成）")
    w("")
    w(f"生成：`zukan_tools/hint_gen.py`　生成日：{js['generatedAt']}　図鑑データ data.py の sha256：`{js['dataSha256']}`")
    w("**このファイルは手で直さない。** 分岐表（data.py）や言い回しを変えたら `python -I hint_gen.py` で作り直す。")
    w("")
    w("## 1. タイプのきほん（そのタイプを初めて登録したとき、同じタイプの全カードに書きこまれる穴）")
    w("")
    w("| タイプ | カード数 | 自動で埋まる穴 | 残りの穴（ヒントで開ける） |")
    w("|---|---|---|---|")
    for t in TYPES:
        n = len([c for c in cards if c.type == t])
        com = "・".join(f"{SLOT_JA[s]}={tc[t][s]}" for s in SLOTS if s in tc[t]) or "なし"
        rest = 7 - len(tc[t])
        w(f"| {t} | {n} | {com} | {rest} |")
    w("")
    w("## 2. カードごとの必要ヒント数と「ねらってから」の見積り")
    w("")
    w("前提：ひらめき 1日2回（なつき度Lv4〜6）、ねらいを1枚に絞る、確実ルート（全部の穴が開いてから仕込む＝1回で成功）。")
    w("ヒント待ちの日数＝ceil(必要ヒント数÷2)。熟成は短縮なしの名目値。タイプ未登録のときは7個、登録後は「7−自動で埋まる穴」個。")
    w("")
    w("| No | チーズ | タイプ | 必要ヒント（タイプ未登録／登録後） | ヒント待ち（日） | 熟成 | 合計の目安（日） |")
    w("|---|---|---|---|---|---|---|")
    for c in cards:
        n_after = 7 - len(tc[c.type])
        wait = math.ceil(n_after / 2)
        age_min = TH_MIN[c.recipe["time"]]
        total = wait + age_min / 1440
        w(f"| {c.no} | {c.name} | {c.type} | 7／{n_after} | {wait} | {data.TIME_LABEL[c.recipe['time']]} | {total:.1f} |")
    w("")
    w("## 3. ヒント文（中立の言い方。相棒の口調は §4 の型で包む）")
    w("")
    for c in cards:
        season = f"　季節：{c.season_text}" if c.season_text else ""
        w(f"### {c.no}. {c.name}（{c.type}）{season}")
        w("")
        w("| 順 | 穴 | 値 | ヒント文 |")
        w("|---|---|---|---|")
        for i, sl in enumerate(SLOTS, 1):
            mark = "（タイプのきほんで自動）" if sl in tc[c.type] else ""
            val = data.TIME_LABEL[c.recipe[sl]] if sl == "time" else c.recipe[sl]
            w(f"| {i} | {SLOT_JA[sl]} | {val} | {core(c, sl)}{mark} |")
        w("")
    w("## 4. 相棒の口調の型（相棒のタイプ別。{core} にヒント文が入る）")
    w("")
    w("| 相棒のタイプ | 型1 | 型2 |")
    w("|---|---|---|")
    for k, v in WRAP.items():
        w(f"| {k} | {v[0]} | {v[1]} |")
    w("")
    w("工房オリジナルの相棒は推定タイプの型を使う。型1／型2はカードNoと穴の番号で決める（同じヒントは毎回同じ言い方）。")
    w("")
    w("## 5. ひみつのカード（失敗種・工房オリジナル）に出す文")
    w("")
    w("| No | 名前 | カードに出す文（図鑑登録30種以上で表示） |")
    w("|---|---|---|")
    for x in js["secretCards"]:
        w(f"| {x['no']} | {x['name']} | {x['cardHint']} |")
    w("")
    w("## 6. つなぎのセリフ（変数入り）")
    w("")
    w("| キー | 文 |")
    w("|---|---|")
    for k, v in LINES.items():
        w(f"| {k} | {v} |")
    with open(a.out_md, "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")
    print("written", a.out_json, a.out_md, "cards", len(cards), "secret", len(others))


def sample_md(cards, tc, nos):
    L = []
    w = L.append
    for no in nos:
        c = next(x for x in cards if x.no == no)
        w(f"#### No.{c.no} {c.name}（{c.type}／熟成 {data.TIME_LABEL[c.recipe['time']]}）")
        w("")
        w("| 順 | 穴 | 値 | 中立のヒント文 | 相棒が話すとき（例：相棒が白カビ／ハード） |")
        w("|---|---|---|---|---|")
        for i, sl in enumerate(SLOTS, 1):
            t = core(c, sl)
            v = variant_of(c, sl)
            auto = "（タイプのきほんで自動）" if sl in tc[c.type] else ""
            val = data.TIME_LABEL[c.recipe[sl]] if sl == "time" else c.recipe[sl]
            w(f"| {i} | {SLOT_JA[sl]} | {val} | {t}{auto} | {wrap('白カビ', t, v)}／{wrap('ハード', t, v)} |")
        fin = c.recipe["finish"]
        if FIN_UNLOCK.get(fin, 0) > 0:
            w("")
            w(f"仕上げ「{fin}」は図鑑{FIN_UNLOCK[fin]}種で解放。未解放のときは末尾に「{LINES['lock_suffix'].format(n='◯')}」を付ける。")
        w("")
    return "\n".join(L)


def do_check(cards):
    """gen.py §6 と同じ総当たり（季節内）。結果の内訳を出す"""
    exact = {c.key(): c.name for c in cards}
    cnt = collections.Counter()
    total = 0
    for k in all_inputs():
        total += 1
        if k in exact:
            cnt["実在"] += 1
            continue
        for fid, name, _, rule, *_ in data.FAIL:
            if rule(*k):
                cnt["失敗:" + name] += 1
                break
        else:
            cnt["工房:" + data.ORIG[data.infer_type(*k)][0]] += 1
    print("total", total)
    for k, v in sorted(cnt.items(), key=lambda x: -x[1]):
        print(k, v)
    # 近さ：実在65のレシピから1か所だけ変えた入力のうち、別の実在種になるもの
    keys = {c.key() for c in cards}
    near_real = 0
    for c in cards:
        base = dict(zip(["milk", "bac", "press", "room", "time", "care", "finish"], c.key()))
        doms = {"milk": data.MILK, "bac": data.BAC, "press": data.PRESS, "room": data.ROOM,
                "time": data.TIME, "care": data.CARE, "finish": data.FIN}
        for sl, dom in doms.items():
            for v in dom:
                if v == base[sl]:
                    continue
                b2 = dict(base); b2[sl] = v
                k2 = (b2["milk"], b2["bac"], b2["press"], b2["room"], b2["time"], b2["care"], b2["finish"])
                if k2 in keys:
                    near_real += 1
    print("1か所ちがいで別の実在種になる組（向きあり）", near_real)


if __name__ == "__main__":
    main()
