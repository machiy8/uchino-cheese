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
