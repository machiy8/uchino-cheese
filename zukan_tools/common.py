# -*- coding: utf-8 -*-
"""ヒント設計・相棒v2・シミュレーションの共通部品（2026-10-12 チーズくん）
- 図鑑データは data.py を読むだけ（このモジュールは data.py を書き換えない）
- 番号(No)は gen.py と同じ規則で振る（タイプ順の通年種 → 季節限定 → 失敗 → 工房）
- ゲームの数値（しきい値・なつき度・ヒント数・仕上げの解放順）はここ1か所に置く
"""
import os, sys, re, hashlib, datetime, itertools

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import data  # noqa: E402

TYPES = ["フレッシュ","白カビ","青カビ","ウォッシュ","シェーブル","セミハード","ハード","パスタフィラータ"]
TYPE_ID = {"フレッシュ":"fresh","白カビ":"white_mold","青カビ":"blue_mold","ウォッシュ":"washed",
           "シェーブル":"chevre","セミハード":"semi_hard","ハード":"hard","パスタフィラータ":"pasta_filata"}

# ---- レシピの穴（ヒントで開く順番）
SLOTS = ["milk","bac","press","room","care","time","finish"]
SLOT_JA = {"milk":"乳","bac":"菌","press":"圧搾","room":"熟成庫","care":"手入れ","time":"取り出し時間","finish":"仕上げ"}
SLOT_IDX = {"milk":3,"bac":4,"press":5,"room":6,"time":7,"care":8,"finish":9}  # data.S のタプル位置
SLOT_PHASE = {"milk":"仕込み","bac":"仕込み","press":"仕込み","room":"仕込み","care":"熟成中","time":"取り出し","finish":"取り出し"}

# ---- 放置時間（分）。T_k の窓は [TH[k], TH[k+1])、T7 は上限なし
TIME_KEYS = ["T1","T2","T3","T4","T5","T6","T7"]
TH_MIN = {"T1":30,"T2":180,"T3":720,"T4":1440,"T5":4320,"T6":10080,"T7":20160}

# ---- なつき度（相棒仕様 v1 §1-2 を引き継ぐ）
LV_TH = [0,50,150,300,500,800,1200,1800,2600,3600]       # Lv1..10 の累計しきい値
BOOST_BY_LV = {1:0,2:0,3:0,4:3,5:3,6:5,7:5,8:7,9:7,10:10}  # 熟成時間の短縮%（最大10）
# ---- 相棒の「ひらめき」（1日に開くヒントの数）
HINTS_PER_DAY_BY_LV = {1:2,2:2,3:2,4:3,5:3,6:3,7:4,8:4,9:4,10:4}
AD_HINTS_PER_DAY = 2      # リワード広告（任意）での上限
AGING_SLOTS = 3           # 熟成棚の枠（d決定 2026-10-12）
# ---- 仕上げの解放（図鑑の登録数＝失敗種・工房オリジナルも数える。d決定 2026-10-12：登録数3ごとに1つ）
FIN_UNLOCK = {"なし":0,"燻製":0,"葉":0,"木炭":0,"木":3,"わら":6,"四角型":9,"酒":12,
              "ワックス":15,"ハート型":18,"ピラミッド型":21,"シロン":24,"布":27}

# ==== 相棒（うちの子）の数値（docs/specs/相棒チーズ_仕様_v2.md。2026-10-30 チーズくん）
# - 仕様の空白12点は d 裁定（2026-10-30）で埋めた。裁定で決めた所は「d裁定 10/30」と書く（オーナーが変えたければ後で変える）
# - None（＝裁定待ち）は置かない。export_app_data.py は None が残っていたら止まる
# - 時間は _H＝時間、_SEC＝秒、時刻は 0〜23 の「時」。日付の切り替えは BUDDY_DAY_BOUNDARY_HOUR
# - 操作の名前は保存データ（§10-2 daily.counts）のキー：pet なでる／talk 話しかける／feed ごはん／care お手入れ／
#   sleep 寝かせる／sun 日向ぼっこ・ひんやり／photo 記念撮影
# ---- 機嫌（§1 の表・§10-4）
BUDDY_MOOD_INIT = 70
BUDDY_MOOD_MIN = 0
BUDDY_MOOD_MAX = 100
BUDDY_MOOD_DECAY_AFTER_H = 6     # 最後の操作から6時間たつと
BUDDY_MOOD_DECAY_PER_H = 2       # 1時間に2ずつ下がる（下限 BUDDY_MOOD_MIN）
BUDDY_MOOD_DECAY_WHILE_SLEEPING = False   # 寝ている間は機嫌も下がらない（d裁定 10/30。§10-4 に「寝ている間は止める」を足す）
# 顔5段階：その値以上で、その顔（上から見て最初に当たったもの）。すねすね＝0〜19
BUDDY_MOOD_FACES = {"ごきげん":80, "にこにこ":60, "ふつう":40, "しょんぼり":20, "すねすね":0}
# ---- 元気（§1 の表・§10-4）
BUDDY_ENERGY_INIT = 80
BUDDY_ENERGY_MIN = 10            # 0 にならない（弱る・病気の表現はしない）
BUDDY_ENERGY_MAX = 100
BUDDY_ENERGY_DECAY_AFTER_H = 0   # 猶予なし（§1・§10-4。d裁定 10/30）
BUDDY_ENERGY_DECAY_PER_H = 3     # 起きている間だけ
BUDDY_ENERGY_DECAY_WHILE_SLEEPING = False # 寝ている間は下がらない（§10-4）
BUDDY_ENERGY_SLEEPY_BELOW = 30   # 30未満で「ねむそう」アニメ
# ---- すね（§1 の表・§6・§10-4）
BUDDY_SULK_AFTER_H = 24          # 24時間操作なしで すね
BUDDY_SULK_CLEAR_OPS = ["pet", "talk"]
BUDDY_SULK_CLEAR_COUNT = 2       # なでる・話しかけるを合計2回で解除
BUDDY_SULK_CLEAR_GIVES_EFFECTS = True     # 解除の2回も通常の効果が付き、その日の上限も使う（d裁定 10/30）
# ---- ワイルド度（§1 の表・§6・§10-4）。操作なしの時間がこれ以上で 1・2・3（3日・7日・14日）
BUDDY_WILD_AFTER_H = [72, 168, 336]
BUDDY_WILD_MAX = 3
BUDDY_WILD_DOWN_PER_CARE = 1     # お手入れ1回で1下がる
# ---- 一緒に過ごした日数と段階（§1 の表・§1-1）。段階は「◯日目」から（日数で進む・戻らない）
BUDDY_DAY_BOUNDARY_HOUR = 4      # 日付はローカル時刻の4時切替（§1・§10-2 settings.dayBoundaryHour の既定）
BUDDY_DAYS_AT_BIRTH = 1          # 誕生（チュートリアルの取り出し）で1日目（d裁定 10/30）
BUDDY_STAGE_FROM_DAY = {"newborn":1, "young":2, "ripe":15, "vintage":61}
BUDDY_STAGE_JA = {"newborn":"うまれたて", "young":"若チーズ", "ripe":"食べごろ", "vintage":"ヴィンテージ"}
# ---- デイリー操作7つ（§2 の表）。数値は1回あたりの増減。dailyMax＝効果が付く回数（超えたら反応だけ）
BUDDY_OPS = {
    "pet":   {"mood":5, "affection":1, "energy":0, "cooldownSec":10, "dailyMax":20},
    "talk":  {"mood":3, "affection":2, "energy":0, "cooldownSec":60, "dailyMax":10},
    # ごはん：単に1日3回＋クールダウン3時間（時間帯では区切らない。d裁定 10/30）
    "feed":  {"mood":5, "affection":5, "energy":30, "cooldownSec":3*3600, "dailyMax":3},
    # お手入れ：機嫌・なつきの効果はクールダウンと上限どおり。ワイルド度が1以上なら、下げる効果だけは
    # 上限なし・クールダウンなし（§2・d裁定 10/30）。好みの手入れの +3 はなつきだけ（d裁定 10/30。§1-2 の約96＝90＋3×2）
    # 「つや表示」は見た目の演出だけで数値は持たない（d裁定 10/30）
    "care":  {"mood":5, "affection":5, "energy":0, "cooldownSec":6*3600, "dailyMax":2,
              "wild":-BUDDY_WILD_DOWN_PER_CARE, "wildIgnoresDailyMax":True, "wildIgnoresCooldown":True,
              "prefBonus":{"affection":3, "mood":0}},
    # 寝かせる：夜の時間帯に実行 → 翌朝「おはよう」で wake の効果（元気は足すのではなく100にする）。「1日1回」は dailyMax で表す
    "sleep": {"mood":0, "affection":0, "energy":0, "cooldownSec":0, "dailyMax":1,
              "wake":{"energySet":100, "mood":10, "affection":10}},
    # 日向ぼっこ／ひんやり：好きな方 like・苦手な方 dislike。苦手な方も2回の上限を使う（dislikeUsesDailyMax）。
    # ひらめき（Lv4〜）はその日に初めて好きな方を選んだとき（苦手を先に選んでも後で出る）＝ hintOn "firstLikeOfDay"（d裁定 10/30）
    "sun":   {"cooldownSec":4*3600, "dailyMax":2, "dislikeUsesDailyMax":True, "hintOn":"firstLikeOfDay",
              "like":{"mood":10, "affection":5, "energy":0}, "dislike":{"mood":2, "affection":0, "energy":0}},
    # 記念撮影：何枚でも撮れる。機嫌+5・なつき+5 とも1日1回（d裁定 10/30）
    "photo": {"mood":5, "affection":5, "energy":0, "cooldownSec":0, "dailyMax":1},
}
# ---- 寝かせるの時間帯（§2：夜20時〜翌4時に実行。昼は「まだ眠くないよ」）。fromHour 以上 か toHour 未満
BUDDY_SLEEP_WINDOW = {"fromHour":20, "toHour":4}
BUDDY_WAKE_FROM_HOUR = 4         # 「おはよう」は日付の切り替え（4時）から押せる（d裁定 10/30）
BUDDY_SLEEP_UNTIL_WAKE = True    # 「おはよう」を押さないかぎり寝たまま（自動では起きない。d裁定 10/30）
# ---- 好み（§2 の注・図鑑§1 の手入れと連動）。キーは TYPE_ID の値＋ "fail"（失敗種）＋ "orig"（工房オリジナル）
# "infer"＝工房オリジナルは species.json の type（推定タイプ）の値で引く（d裁定 10/30）
BUDDY_PREF_INFER = "infer"
# 温度：cool＝ひんやり好き／sun＝日向ぼっこ好き
BUDDY_TEMP_PREF = {"fresh":"cool", "white_mold":"cool", "blue_mold":"cool", "chevre":"cool",
                   "washed":"sun", "semi_hard":"sun", "hard":"sun", "pasta_filata":"sun", "fail":"sun",
                   "orig":BUDDY_PREF_INFER}
# 手入れ：wipe＝塩水で拭く／turn＝ひっくり返す。§2 はウォッシュ＝拭く、ハード・セミハード＝返す。
# 残りは d裁定 10/30：白カビ（§10-2 の例）・シェーブル・失敗種＝拭く／青カビ・フレッシュ・パスタフィラータ＝返す
BUDDY_CARE_PREF = {"fresh":"turn", "white_mold":"wipe", "blue_mold":"turn", "washed":"wipe", "chevre":"wipe",
                   "semi_hard":"turn", "hard":"turn", "pasta_filata":"turn", "fail":"wipe",
                   "orig":BUDDY_PREF_INFER}
# ---- ひらめきが出る場面と、出はじめる Lv（§2・§5-1。1日の数は HINTS_PER_DAY_BY_LV）
BUDDY_HINT_SCENE_FROM_LV = {"talk":1, "morning":1, "sun":4, "care":7}
# ---- 再会ボーナス（§2-1）。最後の操作からの時間
BUDDY_REUNION_AFTER_H = 24       # 24時間以上あいて戻ったら「おかえり」
BUDDY_REUNION_AFFECTION = 10     # なつき+10（1日1回）
BUDDY_REUNION_PER_DAY = 1
BUDDY_REUNION_HINT_AFTER_H = 72  # 3日以上あいていたら図鑑ヒントを1つ（3日＝最後の操作から72時間。d裁定 10/30）
BUDDY_REUNION_HINTS = 1
BUDDY_REUNION_HINT_COUNTS_IN_DAILY = False  # 再会のヒントは1日のひらめきの数に入らない（d裁定 10/30）


def level_of(aff):
    lv = 1
    for i, t in enumerate(LV_TH):
        if aff >= t:
            lv = i + 1
    return lv


def short_th(boost_pct):
    """短縮後のしきい値（分）。端数は分未満切り捨て（整数演算）"""
    return {k: TH_MIN[k] * (100 - boost_pct) // 100 for k in TIME_KEYS}


def data_sha():
    with open(os.path.join(HERE, "data.py"), "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


# ---- 季節
def parse_season(s):
    """'秋冬（9/10〜5/10）' → ((9,10),(5,10))、'夏（6〜10月）' → ((6,1),(10,31))"""
    if not s:
        return None
    m = re.search(r"(\d+)/(\d+)〜(\d+)/(\d+)", s)
    if m:
        a, b, c, d = map(int, m.groups())
        return ((a, b), (c, d))
    m = re.search(r"(\d+)〜(\d+)月", s)
    if m:
        a, c = map(int, m.groups())
        last = (datetime.date(2001, c % 12 + 1, 1) - datetime.timedelta(days=1)).day
        return ((a, 1), (c, last))
    raise ValueError("季節の書式が読めない: " + s)


def in_season(win, date):
    if win is None:
        return True
    (a, b), (c, d) = win
    md = (date.month, date.day)
    if (a, b) <= (c, d):
        return (a, b) <= md <= (c, d)
    return md >= (a, b) or md <= (c, d)


# ---- カード（実在65）
class Card:
    def __init__(self, no, s):
        self.no = no
        self.name, self.origin, self.type = s[0], s[1], s[2]
        self.recipe = {k: s[SLOT_IDX[k]] for k in SLOTS}
        self.rare, self.expl, self.persona, self.src, self.season_text = s[10], s[11], s[12], s[13], s[14]
        self.season = parse_season(s[14])
        self.id = "r%02d" % no

    def key(self):
        r = self.recipe
        return (r["milk"], r["bac"], r["press"], r["room"], r["time"], r["care"], r["finish"])


def build_cards():
    cards = []
    no = 0
    for typ in TYPES:
        for s in data.S:
            if s[2] == typ and not s[14]:
                no += 1
                cards.append(Card(no, s))
    for s in data.S:
        if s[14]:
            no += 1
            cards.append(Card(no, s))
    return cards


def build_others(start_no):
    """失敗種・工房オリジナルの (No, id, 名前, 種別, 条件文, 解説)"""
    out = []
    no = start_no
    for fid, name, cond, rule, ex, per, src in data.FAIL:
        no += 1
        out.append((no, "f%02d" % no, name, "失敗種", cond, ex))
    for typ in TYPES:
        no += 1
        nm, per = data.ORIG[typ]
        out.append((no, "o%02d" % no, nm, "工房オリジナル", typ, ""))
    return out


def type_common(cards):
    """タイプ内の全カード（季節限定を含む）で値が1つしかない穴 → {type: {slot: value}}"""
    res = {}
    for typ in TYPES:
        cs = [c for c in cards if c.type == typ]
        com = {}
        for sl in SLOTS:
            vals = {c.recipe[sl] for c in cs}
            if len(vals) == 1:
                com[sl] = vals.pop()
        res[typ] = com
    return res


def judge(m, b, p, r, t, c, f, date, cards):
    """gen.py §1-2 と同じ判定：実在の完全一致 → 失敗ルール（上から）→ 工房オリジナル"""
    for cd in cards:
        if cd.key() == (m, b, p, r, t, c, f) and in_season(cd.season, date):
            return ("real", cd.no, cd.name)
    for fid, name, cond, rule, *_ in data.FAIL:
        if rule(m, b, p, r, t, c, f):
            return ("fail", fid, name)
    typ = data.infer_type(m, b, p, r, t, c, f)
    return ("orig", typ, data.ORIG[typ][0])


def hamming(inp, card):
    """inp: dict slot->value。7つの穴のうち違う数"""
    return sum(1 for sl in SLOTS if inp[sl] != card.recipe[sl])


def all_inputs():
    return itertools.product(data.MILK, data.BAC, data.PRESS, data.ROOM, data.TIME, data.CARE, data.FIN)


def starter_cards(cards):
    """「はじめてのレシピ帳」：2日目〜8日目の朝に1枚ずつ、レシピを全部見せる入門カード。
    フレッシュはチュートリアル（No.1）。他の7タイプから、レア度が低い→熟成が短い→Noが小さいカードを1枚ずつ。
    配る順は熟成が短い順（同じならタイプ順）"""
    out = []
    for typ in TYPES[1:]:
        cs = sorted([c for c in cards if c.type == typ and not c.season],
                    key=lambda c: (c.rare, TH_MIN[c.recipe["time"]], c.no))
        out.append(cs[0])
    out.sort(key=lambda c: (TH_MIN[c.recipe["time"]], TYPES.index(c.type)))
    return out
