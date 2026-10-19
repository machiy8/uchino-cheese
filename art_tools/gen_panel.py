# -*- coding: utf-8 -*-
"""gen_panel.py - 参照画像（複数可）＋指示文から 1 枚の PNG を作る（Gemini API）。API を呼ぶのはこのファイルだけ

元：D:/claude/ウーパーちゃん/work/tools/gen_panel.py（2026-10-08 実呼び出し確認済みの呼び方をそのまま使う）
チーズ用の変更（2026-10-14 チーズくん）：
- 共通の禁止文（GUARD）をチーズ用に差し替え（文字・ロゴ・認証マーク・実在商品・他作品なし）。
  「顔を描かない」「背景はマゼンタ」は体の指示文の側に書く（最終段階の顔つき特別版では顔を描くため）
- 1回ごとに 生成記録.csv（config.LOG_CSV）へ必ず1行書く（失敗も）。2026-10-17：API の前に「開始」の行を書き、終わったら同じ行を結果で書き換える（costlog.start/finish）
- 費用の停止：累計の見込み＋今回が 5,000円（config.STOP_YEN）を超えるなら API を呼ばずに終了（コード 6）
- --bootstrap-master の出力先は master_candidates の下に限る（参照なしで本番の絵を作らない安全装置は元のまま）

環境変数 GEMINI_API_KEY_CHEESE だけを読む（ウーパーちゃん等と共用の GEMINI_API_KEY には戻らない）。
プロセスの環境に無ければ Windows ユーザー環境変数（HKCU の Environment）も見る。無ければ「GEMINI_API_KEY_CHEESE が未設定」と表示して終了（コード 2）。キーは表示しない・書かない。

使い方：
  python gen_panel.py --ref M.png --prompt-file p.txt --out OUT.png --size 2K --kind zukan --key r07
  python gen_panel.py ... --dry-run     # API を呼ばず内容と見込み額だけ表示（キー不要・課金なし）
"""
import argparse
import base64
import json
import mimetypes
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config as C  # noqa: E402
import costlog  # noqa: E402

MAX_REFS = 14                             # 1リクエストの参照画像の上限（公式）
GUARD = (
    "画像の中に文字・数字・吹き出し・ロゴ・透かし・ラベル・認証マーク（AOP/DOP/PDO等）を一切入れない。"
    "実在の商品のパッケージ・ブランド・他作品のキャラクターを描かない。"
    "参照画像の絵柄（線の色と太さ・塗りの段数・質感）をそのまま保つ。"
)
GUARD_BOOTSTRAP = (
    "画像の中に文字・数字・吹き出し・ロゴ・透かし・ラベル・認証マーク（AOP/DOP/PDO等）を一切入れない。"
    "実在の商品のパッケージ・ブランド・他作品のキャラクターを描かない。"
)
BOOTSTRAP_DIR = "master_candidates"
KEY_ENV = "GEMINI_API_KEY_CHEESE"


def read_key():
    """チーズ専用キーだけを読む。プロセス環境→無ければ Windows ユーザー環境変数（レジストリ）。値は表示しない"""
    v = os.environ.get(KEY_ENV, "").strip()
    if v:
        return v
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as k:
            return str(winreg.QueryValueEx(k, KEY_ENV)[0]).strip()
    except Exception:
        return ""


def die(msg, code=1):
    print(msg, file=sys.stderr)
    sys.exit(code)


def load_refs(paths):
    parts = []
    for p in paths:
        fp = Path(p)
        if not fp.is_file():
            die(f"参照画像が見つかりません: {fp}")
        mime = mimetypes.guess_type(fp.name)[0] or "image/png"
        if mime not in ("image/png", "image/jpeg", "image/webp"):
            die(f"参照画像は png/jpeg/webp のみ: {fp}")
        parts.append({"type": "image", "mime_type": mime,
                      "data": base64.b64encode(fp.read_bytes()).decode("ascii")})
    return parts


def extract_image_b64(interaction):
    """SDK の応答から画像(base64)を取り出す（google-genai 2.29.0 で確認した形。元ファイルと同じ）"""
    out = getattr(interaction, "output_image", None)
    if out is not None and getattr(out, "data", None):
        return out.data
    for step in reversed(list(getattr(interaction, "steps", None) or [])):
        for block in reversed(list(getattr(step, "content", None) or [])):
            if getattr(block, "type", None) == "image" and getattr(block, "data", None):
                return block.data
    return None


def usage_dict(interaction):
    u = getattr(interaction, "usage", None)
    if u is None:
        return {}
    try:
        return u.model_dump(exclude_none=True)
    except Exception:
        return {k: getattr(u, k) for k in ("total_input_tokens", "total_output_tokens",
                                           "total_thought_tokens", "total_tokens")
                if getattr(u, k, None) is not None}


def save_as_png(raw, out):
    import io
    from PIL import Image
    im = Image.open(io.BytesIO(raw))
    fmt = im.format
    im.load()
    if im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGB")
    im.save(out, format="PNG")
    return fmt, im.size


def main():
    sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
    sys.stderr.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="参照画像つきで 1 枚生成して PNG 保存")
    ap.add_argument("--ref", action="append", default=[], help="参照画像（複数指定可・必須）")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--prompt", help="指示文")
    g.add_argument("--prompt-file", help="指示文を書いた UTF-8 テキスト")
    ap.add_argument("--out", required=True, help="保存先 PNG")
    ap.add_argument("--model", default=C.DEFAULT_MODEL)
    ap.add_argument("--aspect", default="1:1")
    ap.add_argument("--size", default="2K", choices=["1K", "2K", "4K"], help="K は大文字")
    ap.add_argument("--kind", default="other", help="記録の区分（master/zukan/vintage/icon 等）")
    ap.add_argument("--key", default="", help="記録のキー（例 1/buddy・r07・r01/v_normal）")
    ap.add_argument("--attempt", default="", help="何回目（呼び出し側が渡す）")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--no-guard", action="store_true", help="共通の禁止文を付けない")
    ap.add_argument("--bootstrap-master", action="store_true",
                    help="マスター候補の最初の1枚だけ参照画像なしで作る（出力先が master_candidates の下のときだけ）")
    a = ap.parse_args()

    if a.bootstrap_master:
        if a.ref:
            die("--bootstrap-master は参照画像なしの最初の1枚専用です（--ref と同時に使わない）")
        if BOOTSTRAP_DIR not in Path(a.out).resolve().parts:
            die(f"--bootstrap-master の出力先は {BOOTSTRAP_DIR} フォルダの下に限ります（本番用の絵は参照画像必須）")
    elif not a.ref:
        die("参照画像（--ref）が必要です。マスター画像を参照せずに本番用の絵は作りません。")
    if len(a.ref) > MAX_REFS:
        die(f"参照画像は最大{MAX_REFS}枚です（指定: {len(a.ref)}枚）")

    prompt = a.prompt if a.prompt is not None else Path(a.prompt_file).read_text(encoding="utf-8")
    prompt = prompt.strip()
    if not a.no_guard:
        prompt = prompt + "\n\n" + (GUARD_BOOTSTRAP if a.bootstrap_master else GUARD)

    est = C.est_x10000(a.model, a.size)
    if est is None:
        die(f"単価が config.UNIT_X10000 にありません: {a.model} {a.size}（費用の上限を守れないので実行しない）")
    over, before_yen, after_yen = costlog.check_cap(est)

    if a.dry_run:
        print(f"[dry-run] model={a.model} aspect={a.aspect} size={a.size} 見込み {C.usd_str(est)} USD")
        print(f"[dry-run] 累計の見込み {before_yen}円 → この1回で {after_yen}円（停止ライン {C.STOP_YEN}円）"
              + ("  ※停止ラインを超えるので本番では実行しない" if over else ""))
        print(f"[dry-run] 参照画像 {len(a.ref)} 枚: {', '.join(a.ref)}")
        print(f"[dry-run] 出力: {a.out}\n--- 指示文 ---\n{prompt}")
        return

    if over:
        die(f"[停止] 累計の見込み {before_yen}円＋この1回で {after_yen}円となり、停止ライン {C.STOP_YEN}円を超えます。"
            "生成しません。d に報告してください（上限 6,000円・decision-log 2026-10-14）", 6)

    key = read_key()
    if not key:
        die(f"{KEY_ENV} が未設定です（チーズ専用キー。オーナーが作成。README 参照）", 2)
    try:
        from google import genai
    except ImportError:
        die("google-genai が未インストール: pip install \"google-genai>=2.3.0\"", 3)

    refs = load_refs(a.ref) if a.ref else []
    client = genai.Client(api_key=key)
    out = Path(a.out)
    cid = costlog.start(a.kind, a.key, out, a.model, a.size, a.attempt, est)   # 呼ぶ前に記録（止まっても「開始」で残る）
    try:
        interaction = client.interactions.create(
            model=a.model,
            input=[{"type": "text", "text": prompt}] + refs,
            response_format={"type": "image", "aspect_ratio": a.aspect, "image_size": a.size},
            timeout=300,
        )
    except Exception as e:  # エラー文にキーが混ざっても出さない
        msg = f"{type(e).__name__}: {e}".replace(key, "****")
        costlog.finish(cid, C.OVERHEAD_X10000, {}, "例外")
        die(f"API 呼び出しに失敗しました: {msg[:1500]}", 5)
    usage = usage_dict(interaction)
    b64 = extract_image_b64(interaction)
    if not b64:
        costlog.finish(cid, est, usage, "画像なし")
        st = getattr(interaction, "status", None)
        txt = (getattr(interaction, "output_text", "") or "")[:500]
        die(f"画像が返りませんでした（status={st}）。安全フィルタ等の可能性。指示文を見直してください。{txt}", 4)

    out.parent.mkdir(parents=True, exist_ok=True)
    try:
        fmt, size = save_as_png(base64.b64decode(b64), out)
    except Exception as e:
        costlog.finish(cid, est, usage, "保存失敗")
        die(f"画像の保存に失敗しました: {type(e).__name__}: {e}", 7)
    meta = {"model": a.model, "size": a.size, "aspect": a.aspect, "returned_format": fmt,
            "pixels": list(size), "status": getattr(interaction, "status", None),
            "interaction_id": getattr(interaction, "id", None), "usage": usage}
    out.with_name(out.stem + "_usage.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=1, default=str), encoding="utf-8")
    costlog.finish(cid, est, usage, "成功")
    print(f"保存しました: {out}（返却形式 {fmt}・{size[0]}x{size[1]} → PNG に変換）")
    print(f"累計の見込み：{after_yen}円（停止ライン {C.STOP_YEN}円・実額は AI Studio の Spend で週1回照合）")


if __name__ == "__main__":
    main()
