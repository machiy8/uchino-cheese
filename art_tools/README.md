# art_tools の使い方（うちのチーズの絵・Gemini）

作成：2026-10-14 チーズくん。元はうぱ絵くんの道具（`D:/claude/ウーパーちゃん/work/tools/`・ウーパー側は書き換えていない）。
計画：`D:/claude/チーズ育成/work/絵の制作計画_v2.md`。**状態：準備だけ。1枚も生成していない。**

## 0. 生成を始める前に（オーナー・d）
1. Gemini 残高の扱い＝**決定済み（A：チーズ専用の別プロジェクト・キー・前払い。2026-10-14）**。作成はオーナー
2. キーはオーナーが作り、Windows ユーザー環境変数 `GEMINI_API_KEY_CHEESE` に入れる（共用の `GEMINI_API_KEY` は読まない。起動中のセッションに後から入れた値もレジストリから拾う）（手順はウーパー側 README の 0 章と同じ）。**チーズくんはキーを読まない・表示しない・ファイルに書かない**
3. 料金ページで単価を再確認（https://ai.google.dev/gemini-api/docs/pricing）。変わっていたら `config.py` の `UNIT_X10000` を直す
4. `pip install "google-genai>=2.3.0" pillow numpy`（この PC は google-genai 2.29.0・Pillow 12.1.1・numpy 2.4.3 を確認済み）

## 1. 場所と設定（`config.py` に1か所）
| もの | 場所 |
|---|---|
| 道具・指示文の正本・顔の位置 | `D:/codex/チーズ育成/art_tools/`（git 管理） |
| 生成画像・記録CSV | `D:/claude/チーズ育成/art/`（リポジトリの外。環境変数 `CHEESE_ART_ROOT` で変更可＝試験用） |
| 図鑑のID・名前 | `D:/claude/チーズ育成/work/zukan_tools/out/hints.json`（r01〜r65・f66〜f74・o75〜o82） |

## 2. 費用の守り（チーズで足した所）
- API を呼ぶのは `gen_panel.py` だけ。**1回ごとに `art/生成記録.csv` へ必ず1行**（成功・画像なし・例外とも）
- 呼ぶ前に「記録の見込み合計＋今回」を計算し、**5,000円（`STOP_YEN`）を超えるなら呼ばずに終了（コード 6）**。上限 6,000円（decision-log 2026-10-14）
- 見込み＝画像の単価（2K 504・1K 336）＋上乗せ 170（1/10,000 USD）。円は 150円/USD の仮定で切り捨て。**実額は週1回 AI Studio の Spend で照合**して計画の費用台帳へ
- `--dry-run` はキーも記録も使わず、送る内容と見込み額だけ出す

## 3. 道具の一覧
| 道具 | 元 | 何をするか |
|---|---|---|
| `config.py` | 新規 | 場所・モデル・単価・上限 |
| `costlog.py` | 新規 | 記録CSVの読み書き・停止の判定 |
| `gen_panel.py` | 写して直した | 1枚生成。チーズ用の禁止文（文字・ロゴ・認証マーク・実在商品・他作品）。記録と停止をここで行う。参照なしは `master_candidates` の下だけ（元の安全装置のまま） |
| `runner.py` | 新規 | 作り直しの退避（`_tryN`）・1枚4回まで・送った指示文を `_prompt.txt` に残す |
| `gen_master.py` | 写して直した | マスター候補 5組×3面（buddy＝相棒のクリームチーズ r01／soft＝白カビ／wheel＝ハード）。指示文は `prompts/master_prompts.md` |
| `gen_mix.py` | 写して直した | 正本の指示文1つ＋参照画像を順に渡して1枚（組の混ぜ・最終段階の顔の見本 `face/style_*`） |
| `edit_from.py` | 写して汎用にした | 土台1枚から「他は変えずに◯◯だけ」の編集を N 枚（順番に作る＝停止判定が確実） |
| `cut_bg.py` | 新規 | マゼンタ背景を縁からつながる所だけ透過に。縁の色戻し。内側のにじみ・大きさ・中心のずれを数値で判定（検査 #4・#11） |
| `measure_line.py` | 新規 | 主線の太さ（px）と色を測る。`--ref-px` で ±15% 判定（検査 #1） |
| `face_preview.py` | 新規 | 体に SVG の顔（`face_style.json` の形）を重ねた見本。表情9種＋顔なし＋すね（左右反転）。`--svg-out` で顔の SVG、`--vintage` で最終段階の色（仮の値） |
| `paste_face.py` | 新規 | 最終段階の特別版：AI の画像から顔のまわりの楕円だけを元の体に貼る。外側は元の体と画素一致を確認、体のずれを測って警告（コード 3）。アプリ用の顔の切り抜きも出す |
| `make_compare.py` | 写して直した | マスター候補の比較シート（`--with-face` で SVG の顔つき見本の列を足す） |
| `make_overview.py` | 写して直した | 図鑑の体を ID と名前で並べた一覧（市松の上に置いて透過を確認・`--small 160` で縮小も） |
| `zoom.py`・`fix_tint.py` | そのまま写した | 拡大の並べ・色だけ寄せる後処理 |
| `faces.json` | 新規（雛形） | 82種の顔の位置（cx・cy・w は千分率の整数、null＝未決）。`vintageArt` は特別版の有無 |
| `face_style.json` | 新規（仮の値） | SVG の顔の部品の形と色。マスター確定後に A-3 の見本から測って直す |

## 4. 流れ（計画 v2 §3）
```
python gen_master.py --dry-run                       # 1. 送る内容の確認（課金なし）
python gen_master.py                                 # 2. 15枚（約151円）
python cut_bg.py <候補>/1/buddy.png <候補>/1/buddy_cut.png
python face_preview.py <候補>/1/buddy_cut.png <候補>/1/buddy_face.png --cx 500 --cy 560 --w 380 --expr normal
python make_compare.py --with-face --out <候補>/比較_YYYYMMDD.png   # 3. オーナーが選ぶ
#   選んだ組を art/master/ に固定（buddy.png・soft.png・wheel.png）
python gen_mix.py --key face/style_a --ref <r01の最終段階の土台> --ref art/master/buddy.png --kind vintage --out ...   # 4. 最終段階の顔の見本
python paste_face.py --base r01_v_body.png --ai <AIの出力> --id r01 --out art/vintage/r01_v_normal.png
```

## 5. 試験（2026-10-14・課金なし）
- `gen_master.py --dry-run`：15枚分の指示文と見込み（合計 1.0110 USD ≒ 151円）を表示
- 停止：記録CSVに 4,999円分を置いて本番モードで呼ぶ → 「5,009円となり停止ライン超え」で API を呼ばず終了（コード 6）。キーは環境から外して試した
- 合成画像（マゼンタ背景・JPEG 圧縮）で `cut_bg.py`（にじみ 0・大きさ/中心 OK）→ `measure_line.py`（14px・±15%内）→ `face_preview.py`（9表情＋すね）→ `paste_face.py`（外側一致・ずれ 0／色を変えた土台ではずれ 19 で警告が出ることも確認）→ `make_overview.py`・`make_compare.py`
