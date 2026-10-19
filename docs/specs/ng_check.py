# -*- coding: utf-8 -*-
"""ng_check.py - 相棒の名前の NG語辞書（ng_words_v1.txt）の検査（2026-10-14 チーズくん）

仕様：work/相棒チーズ_仕様_v2.md §4
- 正規化：NFKC → カタカナをひらがなへ → 英字は小文字 → 「ー・〜♪☆！？」（NFKC後の ! ? ~ ･ も）を除く
- 照合：印なし＝正規化後3文字以上は部分一致・2文字以下は完全一致／行頭 * ＝長さに関係なく部分一致／= ＝完全一致（印は案）

やること：
 1. 辞書の読み込み・語数（分類別）・正規化後の重複
 2. 自己検査：辞書の各語そのものが弾かれるか
 3. 誤爆検査：図鑑82種の名前（zukan_tools/out/hints.json）と、ありふれたペット名・ことばの一覧が通るか
使い方：python ng_check.py [--dict ng_words_v1.txt] [--try 名前 ...]
"""
import argparse
import json
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
REMOVE = set("ー・〜♪☆！？!?~～･ｰ")

# 誤爆検査用：ありふれた名前・ことば（自社で列挙。ペット名・食べ物・チーズ・人の愛称）
COMMON_NAMES = """
うちの子 もも まる こむぎ むぎ そら ちょこ ここ きなこ らて もか くるみ ぽち たま みるく くりーむ ちーず
こたろう こてつ ころすけ ころ ころまる はな さくら ゆき しろ くろ ちゃちゃ ぷりん ぷぅ もち だいふく おもち
あずき ごま まめ ぴの ちび ちびすけ ぽん ぽんた たろう じろう ひめ れお るる りん らん ゆず みかん れもん
はちみつ ばたー ばにら かすたーど まかろん わっふる ぱんけーき ぷでぃんぐ どーなつ ちゃい ここあ まっちゃ
えっちゃん けいこ けいこくん せいしろう はくちょう おなべ ちょんまげ ばいぶる ふぇらーり ありす ありすか
くりすます あまね かなる なちゅ ちくわ ちんあなご まんじゅう まんまる まんげつ しなもん しなちゃん
ころせんべい こうかん とうせんぼ ふぞく かたつむり すみれ すぴか しずく つむぎ いろは ひなた
おしるこ おしゃま おかめ おかめいんこ かまぼこ たいやき せんべい かりんとう どらやき あんこ
ぶりー かまんべーる ごーだ もっつぁれら ぱるめざん ぐりゅいえーる ろっくふぉーる ぼーふぉーる ちぇだー
みもれっと えだむ りこった まするぽーね ぺこりーの すかもるつぁ ぷろゔぉろーね たれっじょ もるびえ
ぶらった ふぇた はろーみ ぶるー しぇーぶる うぉっしゅ ゔぃんてーじ
grape canal cucumber peacock badminton japan grass pakistan spicy booboo dickens essex
Mocha Coco Momo Lucky Happy Peach Butter Cheesy Honey Sunny Charlie Max Bella Luna Teddy Oliver
Cream Milky Brie Gouda Feta Stilton Cheddar Edam Swiss Pepper Ginger Cookie Biscuit Muffin
Staffy Supporter Diego Diet Killer Bombay Adam Dickson Scheherazade
""".split()


def kata_to_hira(s):
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in s)


def norm(s):
    s = unicodedata.normalize("NFKC", s).strip()
    s = kata_to_hira(s).lower()
    return "".join(c for c in s if c not in REMOVE)


def load(path):
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
        entries.append({"raw": line, "n": norm(line), "mode": mode, "cat": cat})
    return entries


def is_partial(e):
    if e["mode"] == "*":
        return True
    if e["mode"] == "=":
        return False
    return len(e["n"]) >= 3


def hits(name, entries):
    n = norm(name)
    out = []
    for e in entries:
        if (is_partial(e) and e["n"] in n) or (not is_partial(e) and e["n"] == n):
            out.append(e["raw"])
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--dict", default=str(HERE / "ng_words_v1.txt"))
    ap.add_argument("--try", dest="tries", nargs="*", default=[])
    a = ap.parse_args()
    es = load(a.dict)

    print(f"辞書：{a.dict}")
    print(f"語数：{len(es)}")
    cats = {}
    for e in es:
        cats[e["cat"]] = cats.get(e["cat"], 0) + 1
    for c, k in cats.items():
        print(f"  {c}：{k}")
    print(f"  印 *：{sum(1 for e in es if e['mode'] == '*')}／印 =：{sum(1 for e in es if e['mode'] == '=')}／"
          f"部分一致で照合：{sum(1 for e in es if is_partial(e))}／完全一致で照合：{sum(1 for e in es if not is_partial(e))}")

    seen, dup = {}, []
    for e in es:
        if e["n"] in seen:
            dup.append(f"{seen[e['n']]} = {e['raw']}（{e['n']}）")
        seen[e["n"]] = e["raw"]
    print(f"正規化後の重複：{len(dup)}件 {dup if dup else ''}")
    empty = [e["raw"] for e in es if not e["n"]]
    print(f"正規化で空になる語：{len(empty)}件 {empty if empty else ''}")

    self_miss = [e["raw"] for e in es if not hits(e["raw"], es)]
    print(f"自己検査（辞書の語そのものが弾かれない）：{len(self_miss)}件 {self_miss if self_miss else ''}")

    names = []
    hj = HERE.parent.parent / "zukan_tools" / "out" / "hints.json"  # 2026-10-19 リポジトリの docs/specs/ へ移設（元は work/ 直下）
    if hj.is_file():
        d = json.loads(hj.read_text(encoding="utf-8"))
        names = [c["name"] for c in d.get("cards", [])] + [c["name"] for c in d.get("secretCards", [])]
    fp_cheese = [(nm, hits(nm, es)) for nm in names if hits(nm, es)]
    print(f"図鑑の名前 {len(names)}種：誤って弾く {len(fp_cheese)}件 {fp_cheese if fp_cheese else ''}")
    fp_common = [(nm, hits(nm, es)) for nm in COMMON_NAMES if hits(nm, es)]
    print(f"ありふれた名前・ことば {len(COMMON_NAMES)}語：弾く {len(fp_common)}件")
    for nm, h in fp_common:
        print(f"  {nm} ← {h}")
    for t in a.tries:
        print(f"試し「{t}」（正規化 {norm(t)}）→ {hits(t, es) or '通る'}")


if __name__ == "__main__":
    main()
