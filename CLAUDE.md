# うちのチーズ（uchino-cheese）

チーズを育てて図鑑を埋め、相棒チーズ1体をペットのように可愛がる放置育成ゲーム。対象は大人（13歳以上）。Phase1＝Web版（PWA）＋Android（Capacitor）を8週で作る（W1＝2026-10-26）。

## 構成
| 場所 | 中身 | 誰が変えるか |
|---|---|---|
| `app/` | アプリ本体（Vite＋React＋TypeScript＋Capacitor。W1 で作る） | クラウド（PR） |
| `zukan_tools/` | 図鑑データの正本（`data.py`）・判定・ヒント文の生成 | **数値はローカルだけ** |
| `art_tools/` | 絵の道具・`face_style.json`・`faces.json`・`neck_calc.py` | **ローカルだけ（読むのは自由）** |
| `docs/` | 実装計画・決定事項の要約・受け渡しの約束 | d が確認して更新 |

絵の原本（2048px）・画像生成の鍵・費用記録はリポジトリに無い。書き出した完成品（WebP 等）だけがローカルから commit される。

## 最初に読む
1. `docs/決定事項_要約.md`（決まったこと。蒸し返さない）
2. `docs/実装計画_Phase1.md`（画面・データ構造・技術・週ごとの工程・テスト方針）
3. `docs/受け渡し.md`（絵とデータの受け取り方）
4. **仕様の正本は `docs/specs/`**（相棒仕様 v2・ヒント設計・分岐表・顔の型・NG語辞書と ng_check.py）。必要な節だけ開く

## テストの回し方
```
# 図鑑データの検証（Python 3・標準ライブラリだけ）
python -I zukan_tools/check.py zukan_tools     # 82種・入力87,360通りで結果が必ず1つ
python -I zukan_tools/hint_gen.py --check      # 判定の内訳が分岐表と一致
# アプリ（W1 以降）
cd app && npm ci && npm run test && npm run build
```
Windows では `check.py`・`gen.py` に `PYTHONIOENCODING=utf-8` を付ける。

## ブランチの規則
- `master`＝本番。**直接 push しない**。作業は master からブランチを切り、PR で出す
- PR には「何を変えたか・どう確かめたか（実行したコマンドと結果）・必要な絵やデータ」を書く
- master への反映は d の検収（ローカルで pull→テスト→Codex 監査）とオーナー承認の後

## 触らないもの
- `art_tools/` の値と `face_style.json`・`faces.json`（変えるのはローカルのチーズくんだけ）
- `zukan_tools/data.py` の図鑑の値（アプリ側で値を手で直さない。食い違いは書き出し→テストで止める）
- 鍵・秘密情報：`.env`・`*.keystore`・`*.jks`・`google-services.json`・API キー。**作らない・表示しない・commit しない**
- 絵を生成しない。足りない絵は PR に「必要な絵」として書く
- お金がかかる操作・アカウント作成（ストア・広告・Firebase・ドメイン）はしない

## 守る原則
- ログインなし・端末内保存・ガチャなし。相棒は死なない・消えない。なつき・段階・日数・開いたヒントは減らさない
- ゲームの中身は `(state, now) → state` の純粋関数。時刻は `src/game/time.ts` だけで扱う
- 判定・熟成短縮・顔の図形は「Python が答えを作り、TypeScript が全件一致させる」
- チーズの製法を断定しない（ヒント文は「ゲームのレシピ」）。工房オリジナルは実在の銘柄ではないと明記
- 名称 NG：「チーズくん」「チーズ」単体「Qちゃん」。アプリ本体・コードにウーパーの名前を入れない（案内役は `src/host/` の JSON で差し替え）
- 迷ったら推測で進めず、止まって質問する
