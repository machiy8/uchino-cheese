# -*- coding: utf-8 -*-
"""config.py - うちのチーズの絵の道具の設定（場所・モデル・単価・費用の上限）を1か所に置く

うぱ絵くんの道具（D:/claude/ウーパーちゃん/work/tools/）を写してチーズ用に直したもの（2026-10-14 チーズくん）。
ウーパーちゃん側のファイルは書き換えていない。

- 生成画像の作業場所（候補・図鑑・記録CSV）はリポジトリの外：既定 D:/claude/チーズ育成/art
  環境変数 CHEESE_ART_ROOT で変えられる（試験用）
- APIキーは環境変数 GEMINI_API_KEY_CHEESE（チーズ専用・共用の GEMINI_API_KEY は使わない）を gen_panel.py だけが読む。この設定ファイルには書かない
- 金額は浮動小数点で掛けない。単価は 1/10,000 USD の整数、円は 155円/USD（10/17 AI Studio 実額から逆算した約153.6円を安全側に丸め）で切り捨て
"""
import os
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
REPO = TOOLS.parent                                            # D:/codex/チーズ育成
ART_ROOT = Path(os.environ.get("CHEESE_ART_ROOT", "D:/claude/チーズ育成/art"))
CAND_DIR = ART_ROOT / "master_candidates"                      # マスター候補（記録用）
MASTER_DIR = ART_ROOT / "master"                               # オーナーが選んで固定したマスター（本番の参照）
MASTER_GROUP = "3"                                             # 2026-10-16 オーナー決定：組3（太線・シール風）
MASTER_REFS = [MASTER_DIR / "buddy.png", MASTER_DIR / "soft.png", MASTER_DIR / "wheel.png"]   # 本番の生成は既定でこの3面を参照に渡す（マゼンタ背景のまま）
MASTER_LINE_PX = 27                                            # 組3の主線の実測（2K・measure_line.py・3面×5点の中央値）。図鑑の検査 #1 の基準（±15%）
MASTER_LINE_HEX = "#582819"                                    # 同・主線の平均色
ZUKAN_DIR = ART_ROOT / "zukan"                                 # 図鑑の体（<id>.png・透過）
VINTAGE_DIR = ART_ROOT / "vintage"                             # 最終段階（ヴィンテージ）の顔つき特別版
LOG_CSV = ART_ROOT / "生成記録.csv"                             # gen_panel.py が1回ごとに1行書く

PROMPT_MD = TOOLS / "prompts" / "master_prompts.md"            # マスター候補の指示文の正本
FACES_JSON = TOOLS / "faces.json"                              # 体ごとの顔の位置（雛形）
FACE_STYLE_JSON = TOOLS / "face_style.json"                    # SVG の顔の部品の形と色（マスター確定後に埋める）
HINTS_JSON = Path(os.environ.get("CHEESE_HINTS_JSON",
                                 str(REPO / "zukan_tools" / "out" / "hints.json")))  # 2026-10-19 正本をリポジトリへ移設

DEFAULT_MODEL = "gemini-nano-banana-2.1"     # ウーパーちゃんで実呼び出し確認済み（2026-10-08）。生成前に料金ページを再確認
MAGENTA = (255, 0, 255)                      # 生成時の背景色（チーズの色に無い）

# 1枚あたりの画像出力の単価（1/10,000 USD の整数）。出典 D:/claude/ウーパーちゃん/work/画像生成の仕組み.md（確認日 2026-10-08）
UNIT_X10000 = {
    ("gemini-nano-banana-2.1", "1K"): 336,
    ("gemini-nano-banana-2.1", "2K"): 504,
    ("gemini-nano-banana-2.1", "4K"): 1130,
}
# 画像以外（入力の参照画像・文・思考）の1回あたりの上乗せ。ウーパーちゃんの実測 0.0155〜0.0156 USD/回を切り上げ
OVERHEAD_X10000 = 170
YEN_PER_USD = 155                            # 10/17 実額照合で約153.6円/USD → 安全側に155

# 費用の上限（decision-log 2026-10-14 オーナー回答：初回制作の上限 6,000円・5,000円を超えたら止めて報告）
CAP_YEN = 6000
STOP_YEN = 5000                              # 累計の見込みがこれを超える呼び出しは gen_panel.py が実行しない

MAX_ATTEMPTS = 4                             # 1枚につき初回＋作り直し3回まで（絵の制作計画 §4）


def est_x10000(model, size):
    """1回の見込み（1/10,000 USD の整数）。単価が不明なら None"""
    u = UNIT_X10000.get((model, size))
    return None if u is None else u + OVERHEAD_X10000


def yen_of(x10000):
    """1/10,000 USD の整数 → 円（155円/USD・1円未満切り捨て）"""
    return x10000 * YEN_PER_USD // 10000


def usd_str(x10000):
    return f"{x10000 // 10000}.{x10000 % 10000:04d}"
