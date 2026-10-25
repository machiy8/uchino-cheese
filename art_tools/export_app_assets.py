# -*- coding: utf-8 -*-
"""export_app_assets.py - 絵の原本（art/・リポジトリの外）からアプリに同梱する WebP と manifest.json を書き出す

2026-10-25 チーズくん。正本の手順：docs/実装計画_Phase1.md §2-3 の手順3・§6 #10・#11、docs/受け渡し.md「絵」。

使い方（リポジトリ直下で・ローカルだけ。原本 art/ はクラウドに無い）：
  set OPENBLAS_NUM_THREADS=1
  python -I art_tools/export_app_assets.py --out app/public/assets
  python -I art_tools/export_app_assets.py --out app/public/assets --only body      # 区分を絞る
  python -I art_tools/export_app_assets.py --out app/public/assets --report <scratchpad>/check.json

書き出すもの（どれも完成版だけ。_bak_*・check・_try・raw の作り直し前は使わない）：
  body        体82種（art/zukan/<id>.png＝cut_bg→normalize_pad 済みの 2048px 透過PNG・顔なし）→ 512・1024 の WebP（キャンバスごと縮小。faces.json の千分率がそのまま使える）
  overlay     重ね絵 D1 産毛・D2 ひび・E1〜E3 ワイルド度（art/extras/D・E/<id>.png）。fit=tile はキャンバスごと、fit=mass は中身の外接矩形で切ってから縮小（extras_lib.overlay_tile／overlay_mass と同じ）
  dress       着せ替え F1〜F8（art/extras/F/<id>.png）。中身の外接矩形（アルファ>60＝extras_lib.bbox）で切ってから縮小。slot は extras_lib.ITEM_KIND と同じ
  bg          背景 G1〜G3（art/extras/G/raw/<id>.png・1536×2752 の不透明・後処理なし）→ 1080×1920（幅を1080に縮め、上下を中央で切る。縦横の倍率は同じ＝ゆがめない）
  photoBg     記念撮影の背景 M1（art/extras/M/raw/M1.png・2048 正方形の不透明）→ 1080×1080
  icon        UIアイコン H01〜H35（art/extras/H/<id>_256.png・余白7%でそろえた256版）→ 256 の WebP
  ui          UI飾り J1〜J4（art/extras/J/<id>.png）。中身の外接矩形（アルファ>0）で切ってから縮小
  vintage     特別版 r01 の4枚（art/vintage/r01_v_{normal,smile,sad,sleep}.png・顔つき）→ 512・1024
  vintageFace 同・顔の切り抜き（*_facecrop.png）と貼る位置（*_paste.json の crop_box を千分率に）→ 体の 512・1024 と同じ倍率
ファイル名：<区分のフォルダ>/<大きさ>/<ID>.webp。アプリは manifest.json だけを見て絵を探す（パスは manifest からの相対）。
manifest には元PNGの sha256（差し替えの追跡）と、書き出した WebP の sha256（PWA のキャッシュ名に使える）を入れる。
日時は入れない（同じ原本なら何度書き出しても同じ manifest になる＝差分が出ない）。

メモリ：空きが約1.5GBなので1枚ずつ開いて閉じる。numpy は使わない（Pillow だけ）。
縮小はアルファ乗算済み（RGBa）で行う。透過部分の RGB にマゼンタが残っていても縁ににじませないため。
"""
import argparse
import gc
import hashlib
import json
import os
import sys
from pathlib import Path

os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")

from PIL import Image  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config as C  # noqa: E402

ART = C.ART_ROOT
EX = ART / "extras"
VINTAGE_EXPR = ["normal", "smile", "sad", "sleep"]
# extras_lib.ITEM_KIND と同じ（extras_lib は読み込むと顔の部品まで読むので値を写す。変えるときは両方）
DRESS_SLOT = {"F1": "hat", "F2": "hat", "F3": "hat", "F4": "neck", "F5": "neck", "F6": "mat", "F7": "mat", "F8": "mat"}
# extras_lib：D1・D2・E1＝overlay_tile（キャンバス全体を体の外接矩形×1.15に合わせる）、E2・E3＝overlay_mass（中身の外接矩形を体の矩形に合わせる）
OVERLAY_FIT = {"D1": "tile", "D2": "tile", "E1": "tile", "E2": "mass", "E3": "mass"}
BBOX_TH = 60          # extras_lib.bbox と同じしきい値（アルファ>60）
WEBP = {"quality": 90, "method": 6}          # 透過はアルファを可逆で持つ（Pillow の既定 alpha_quality=100）
WEBP_OPAQUE = {"quality": 86, "method": 6}
BG_SIZE = (1080, 1920)
PHOTO_BG = 1080
CATEGORIES = ["body", "overlay", "dress", "bg", "photoBg", "icon", "ui", "vintage", "vintageFace"]


def sha256(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def species_ids():
    d = json.loads(C.HINTS_JSON.read_text(encoding="utf-8"))
    ids = [c["id"] for c in d["cards"] + d["secretCards"]]
    if len(ids) != 82 or len(set(ids)) != 82:
        raise SystemExit(f"hints.json の種の数が82でない／重複あり：{len(ids)}")
    return ids


def rel_src(p):
    return Path(p).resolve().relative_to(ART.resolve()).as_posix()


def shrink(im, size):
    """アルファ乗算済みで縮小（透過）／そのまま縮小（不透明）"""
    if im.mode == "RGBA":
        return im.convert("RGBa").resize(size, Image.LANCZOS).convert("RGBA")
    return im.resize(size, Image.LANCZOS)


def alpha_box(im, th):
    a = im.getchannel("A")
    if th > 0:
        a = a.point(lambda v: 255 if v > th else 0)
    return a.getbbox()


def permille(box, w, h):
    L, T, R, B = box
    return [round(L * 1000 / w), round(T * 1000 / h), round(R * 1000 / w), round(B * 1000 / h)]


def save_webp(im, out_root, relpath, opaque=False):
    p = out_root / relpath
    p.parent.mkdir(parents=True, exist_ok=True)
    im.save(p, "WEBP", **(WEBP_OPAQUE if opaque else WEBP))
    return {"path": relpath, "w": im.width, "h": im.height, "bytes": p.stat().st_size, "sha256": sha256(p)}


def verify(out_root, v, expect_alpha, ref=None):
    """書き出した WebP を開き直して確かめる。ref＝同じ縮小をした元（アルファの差を見る）"""
    with Image.open(out_root / v["path"]) as im:
        im.load()
        r = {"path": v["path"], "size_ok": im.size == (v["w"], v["h"]), "mode": im.mode}
        if expect_alpha:
            if im.mode != "RGBA":
                r["alpha_ok"] = False
                return r
            a = im.getchannel("A")
            w, h = im.size
            corners = [a.getpixel((0, 0)), a.getpixel((w - 1, 0)), a.getpixel((0, h - 1)), a.getpixel((w - 1, h - 1))]
            r["corner_alpha"] = corners
            ex = a.getextrema()
            r["alpha_min"], r["alpha_max"] = ex
            r["transparent_px"] = a.histogram()[0]
            r["alpha_ok"] = ex[0] == 0   # 透過の画素がある（重ね絵は最大が255未満のこともある）
            if ref is not None:
                from PIL import ImageChops
                diff = ImageChops.difference(a, ref.getchannel("A")).getextrema()[1]
                r["alpha_maxdiff_vs_src"] = diff
        else:
            r["alpha_ok"] = im.mode == "RGB"
    return r


def two_sizes(src, out_root, folder, cid, crop_th=None):
    """2048 の原本を 1/4（512相当）と 1/2（1024相当）に。crop_th があれば中身の外接矩形で切ってから同じ倍率で縮める"""
    with Image.open(src) as im0:
        im = im0.convert("RGBA")
    W, H = im.size
    ent = {"src": rel_src(src), "srcSha256": sha256(src), "srcW": W, "srcH": H, "variants": {}}
    checks = []
    box = None
    if crop_th is not None:
        box = alpha_box(im, crop_th)
        ent["srcBox"] = list(box)
        ent["srcBoxPermille"] = permille(box, W, H)
        ent["cropAlphaThreshold"] = crop_th
        im = im.crop(box)
    for label, den in (("512", 4), ("1024", 2)):
        if crop_th is None:
            size = (W * int(label) // 2048, H * int(label) // 2048)
            if W != 2048 or H != 2048:
                raise SystemExit(f"{src} が 2048×2048 でない：{W}×{H}")
        else:
            size = (max(1, round(im.width / den)), max(1, round(im.height / den)))
        sm = shrink(im, size)
        v = save_webp(sm, out_root, f"{folder}/{label}/{cid}.webp")
        c = verify(out_root, v, True, sm)
        # 縦横比（元＝切った後の中身・書き出し）
        c["aspect_src"] = round(im.width / im.height, 4)
        c["aspect_out"] = round(v["w"] / v["h"], 4)
        c["aspect_diff"] = abs(c["aspect_src"] - c["aspect_out"])
        c["corner_ok"] = (crop_th is not None) or all(x == 0 for x in c["corner_alpha"])
        checks.append(c)
        ent["variants"][label] = v
        del sm
    del im
    gc.collect()
    return ent, checks


def body_extent_permille(src):
    """normalize_pad の確かめ：中身の長い辺が 740〜800‰ か"""
    with Image.open(src) as im:
        box = im.getchannel("A").point(lambda v: 255 if v > BBOX_TH else 0).getbbox()
        W, H = im.size
    L, T, R, B = box
    return max((R - L) * 1000 // W, (B - T) * 1000 // H)


def export(out_root, only, report):
    man = {"schemaVersion": 1, "tool": "art_tools/export_app_assets.py",
           "note": "パスは manifest.json からの相対。src は絵の原本（D:/claude/チーズ育成/art/ からの相対・リポジトリの外）。srcSha256 は元PNG、sha256 は書き出したWebP",
           "webp": {"transparent": WEBP, "opaque": WEBP_OPAQUE, "resize": "LANCZOS（透過はアルファ乗算済みで縮小）"},
           "categories": {}, "pending": {}}
    old = out_root / "manifest.json"
    if only and old.exists():   # 区分を絞ったときは他の区分を前回のまま残す
        prev = json.loads(old.read_text(encoding="utf-8"))
        man["categories"] = prev.get("categories", {})
        man["pending"] = prev.get("pending", {})
    cats = only or CATEGORIES
    rep = {"checks": {}, "notes": []}

    def put(cat, cid, ent, checks):
        man["categories"].setdefault(cat, {})[cid] = ent
        rep["checks"].setdefault(cat, []).extend(checks)
        print(f"  {cat} {cid}: " + " ".join(f"{k}={v['w']}x{v['h']}/{v['bytes']}B" for k, v in ent["variants"].items()), flush=True)

    for cat in cats:
        man["categories"][cat] = {}
        rep["checks"][cat] = []
        print(f"[{cat}]", flush=True)
        if cat == "body":
            ext = {}
            for cid in species_ids():
                src = C.ZUKAN_DIR / f"{cid}.png"
                if not src.exists():
                    raise SystemExit(f"体が無い：{src}")
                ext[cid] = body_extent_permille(src)
                ent, ck = two_sizes(src, out_root, "body", cid)
                put(cat, cid, ent, ck)
            rep["body_long_side_permille"] = ext
        elif cat == "overlay":
            for cid, fit in OVERLAY_FIT.items():
                src = EX / cid[0] / f"{cid}.png"
                ent, ck = two_sizes(src, out_root, "overlay", cid, BBOX_TH if fit == "mass" else None)
                ent["fit"] = fit
                put(cat, cid, ent, ck)
        elif cat == "dress":
            for cid, slot in DRESS_SLOT.items():
                ent, ck = two_sizes(EX / "F" / f"{cid}.png", out_root, "dress", cid, BBOX_TH)
                ent["slot"] = slot
                put(cat, cid, ent, ck)
        elif cat == "ui":
            for cid in ["J1", "J2", "J3", "J4"]:
                ent, ck = two_sizes(EX / "J" / f"{cid}.png", out_root, "ui", cid, 0)
                put(cat, cid, ent, ck)
        elif cat == "vintage":
            for e in VINTAGE_EXPR:
                cid = f"r01_v_{e}"
                ent, ck = two_sizes(C.VINTAGE_DIR / f"{cid}.png", out_root, "vintage", cid)
                ent["species"], ent["expr"] = "r01", e
                put(cat, cid, ent, ck)
        elif cat == "vintageFace":
            for e in VINTAGE_EXPR:
                cid = f"r01_v_{e}"
                src = C.VINTAGE_DIR / f"{cid}_facecrop.png"
                pj = json.loads((C.VINTAGE_DIR / f"{cid}_paste.json").read_text(encoding="utf-8"))
                L, T, R, B = pj["crop_box"]
                with Image.open(src) as im0:
                    im = im0.convert("RGBA")
                if im.size != (R - L, B - T):
                    raise SystemExit(f"{src} の大きさが crop_box と合わない")
                ent = {"src": rel_src(src), "srcSha256": sha256(src), "srcW": im.width, "srcH": im.height,
                       "species": "r01", "expr": e, "bodyCanvas": 2048, "pasteBox": [L, T, R, B],
                       "pasteBoxPermille": permille((L, T, R, B), 2048, 2048), "variants": {}}
                ck = []
                for label, den in (("512", 4), ("1024", 2)):
                    sm = shrink(im, (round(im.width / den), round(im.height / den)))
                    v = save_webp(sm, out_root, f"vintage_face/{label}/{cid}.webp")
                    c = verify(out_root, v, True, sm)
                    c["aspect_src"], c["aspect_out"] = round(im.width / im.height, 4), round(v["w"] / v["h"], 4)
                    c["aspect_diff"] = abs(c["aspect_src"] - c["aspect_out"])
                    c["corner_ok"] = True   # 切り抜きは矩形の中身なので角の透過は問わない
                    ck.append(c)
                    ent["variants"][label] = v
                    del sm
                del im
                gc.collect()
                put(cat, cid, ent, ck)
        elif cat == "bg":
            for cid in ["G1", "G2", "G3"]:
                src = EX / "G" / "raw" / f"{cid}.png"
                with Image.open(src) as im0:
                    im = im0.convert("RGB")
                W, H = im.size
                s = BG_SIZE[0] / W
                sh = round(H * s)
                if sh < BG_SIZE[1]:
                    raise SystemExit(f"{cid}：縮めると高さが {sh} で 1920 に足りない")
                sm = im.resize((BG_SIZE[0], sh), Image.LANCZOS)
                top = (sh - BG_SIZE[1]) // 2
                sm = sm.crop((0, top, BG_SIZE[0], top + BG_SIZE[1]))
                v = save_webp(sm, out_root, f"bg/{cid}.webp", opaque=True)
                c = verify(out_root, v, False)
                c["scale_x"], c["scale_y"] = round(BG_SIZE[0] / W, 6), round(sh / H, 6)
                c["aspect_diff"] = abs(c["scale_x"] - c["scale_y"])   # 倍率が縦横で同じ＝ゆがみなし
                c["crop_rows_top_bottom"] = [top, sh - BG_SIZE[1] - top]
                c["corner_ok"] = True
                ent = {"src": rel_src(src), "srcSha256": sha256(src), "srcW": W, "srcH": H,
                       "fit": f"幅を{BG_SIZE[0]}に縮め（倍率{s:.6f}）、高さ{sh}から上{top}・下{sh - BG_SIZE[1] - top}行を切った",
                       "variants": {"1080x1920": v}}
                del im, sm
                gc.collect()
                put(cat, cid, ent, [c])
        elif cat == "photoBg":
            src = EX / "M" / "raw" / "M1.png"
            with Image.open(src) as im0:
                im = im0.convert("RGB")
            W, H = im.size
            sm = im.resize((PHOTO_BG, PHOTO_BG * H // W), Image.LANCZOS)
            v = save_webp(sm, out_root, "photo_bg/M1.webp", opaque=True)
            c = verify(out_root, v, False)
            c["aspect_src"], c["aspect_out"] = round(W / H, 4), round(v["w"] / v["h"], 4)
            c["aspect_diff"] = abs(c["aspect_src"] - c["aspect_out"])
            c["corner_ok"] = True
            ent = {"src": rel_src(src), "srcSha256": sha256(src), "srcW": W, "srcH": H, "variants": {"1080": v}}
            del im, sm
            put(cat, "M1", ent, [c])
        elif cat == "icon":
            for n in range(1, 36):
                cid = f"H{n:02d}"
                src = EX / "H" / f"{cid}_256.png"
                with Image.open(src) as im0:
                    im = im0.convert("RGBA")
                if im.size != (256, 256):
                    raise SystemExit(f"{src} が 256 でない")
                v = save_webp(im, out_root, f"icon/{cid}.webp")
                c = verify(out_root, v, True, im)
                c["aspect_src"] = c["aspect_out"] = 1.0
                c["aspect_diff"] = 0.0
                c["corner_ok"] = all(x == 0 for x in c["corner_alpha"])
                ent = {"src": rel_src(src), "srcSha256": sha256(src), "srcW": 256, "srcH": 256, "variants": {"256": v}}
                del im
                put(cat, cid, ent, [c])
        else:
            raise SystemExit(f"知らない区分：{cat}")

    # 一覧（区分ごとの枚数と合計バイト）
    summ = {}
    for cat, items in man["categories"].items():
        files = [v for e in items.values() for v in e["variants"].values()]
        summ[cat] = {"ids": len(items), "files": len(files), "bytes": sum(v["bytes"] for v in files)}
    man["summary"] = summ
    out_root.mkdir(parents=True, exist_ok=True)
    (out_root / "manifest.json").write_text(json.dumps(man, ensure_ascii=False, indent=1, sort_keys=False) + "\n", encoding="utf-8")
    # 確かめの集計
    bad = []
    for cat, cks in rep["checks"].items():
        for c in cks:
            if not (c.get("size_ok") and c.get("alpha_ok") and c.get("corner_ok") and c.get("aspect_diff", 1) <= 0.01
                    and c.get("alpha_maxdiff_vs_src", 0) <= 2):
                bad.append(c)
    rep["summary"] = summ
    rep["bad"] = bad
    if "body" in cats:
        ext = rep["body_long_side_permille"]
        rep["body_long_side_range"] = [min(ext.values()), max(ext.values())]
        rep["body_long_side_out_of_740_800"] = {k: v for k, v in ext.items() if not 740 <= v <= 800}
    if report:
        Path(report).parent.mkdir(parents=True, exist_ok=True)
        Path(report).write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding="utf-8")
    print("\n区分ごと：")
    for cat, s in summ.items():
        print(f"  {cat:12s} {s['ids']:3d}件 {s['files']:3d}ファイル {s['bytes'] / 1e6:8.3f} MB")
    print(f"  合計 {sum(s['files'] for s in summ.values())} ファイル {sum(s['bytes'] for s in summ.values()) / 1e6:.3f} MB")
    if "body" in cats:
        print(f"体の長い辺（‰）：{rep['body_long_side_range']}・740〜800 の外：{rep['body_long_side_out_of_740_800'] or 'なし'}")
    print(f"確かめで外れたファイル：{len(bad)}")
    for c in bad[:20]:
        print("  ", c)
    return 1 if bad else 0


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True, help="書き出し先（app/public/assets）")
    ap.add_argument("--only", nargs="*", default=[], choices=CATEGORIES)
    ap.add_argument("--report", help="確かめの詳細を JSON で書く場所（リポジトリの外に）")
    a = ap.parse_args()
    raise SystemExit(export(Path(a.out), a.only, a.report))


if __name__ == "__main__":
    main()
