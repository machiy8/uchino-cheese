# -*- coding: utf-8 -*-
"""make_sheets_HI.py - 区分 H（UIアイコン35）・I（アプリアイコン・フィーチャーグラフィック）の後処理と一覧"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from PIL import Image, ImageDraw, ImageFilter  # noqa: E402
import extras_lib as X  # noqa: E402
import post_extras as PE  # noqa: E402
from art_common import font  # noqa: E402

HNAMES = {1: "牛乳", 2: "山羊乳", 3: "羊乳", 4: "水牛乳", 5: "菌なし", 6: "白カビ", 7: "青カビ", 8: "ウォッシュ菌", 9: "穴あき菌",
          10: "手入れなし", 11: "洗う", 12: "返す", 13: "針", 14: "塩", 15: "練る", 16: "仕上げなし", 17: "燻製", 18: "葉", 19: "木炭",
          20: "わら", 21: "木", 22: "酒", 23: "ワックス", 24: "布", 25: "シロン", 26: "ハート型", 27: "ピラミッド型", 28: "四角型",
          29: "なでる", 30: "話しかける", 31: "ごはん", 32: "お手入れ", 33: "寝かせる", 34: "日向ぼっこ／ひんやり", 35: "記念撮影"}
BG = (70, 90, 120)


def post_h(ids):
    for k in ids:
        i = f"H{k:02d}"
        im = Image.open(X.EX / "H" / "raw" / f"{i}.png")
        res, leak = PE.key_magenta(im)
        n = PE.fit_square(res, 1024, 0.07)
        n.save(X.EX / "H" / f"{i}.png")
        n.resize((256, 256), Image.LANCZOS).save(X.EX / "H" / f"{i}_256.png")
        bb = PE.bbox(res)
        print(i, "leak", leak, "bbox%", round((bb[2] - bb[0]) * 100 / im.width), round((bb[3] - bb[1]) * 100 / im.height))


def sheet_h(ids, out):
    fs = font(13)
    cols, bw, bh = 4, 330, 168
    rows = (len(ids) + cols - 1) // cols
    s = Image.new("RGB", (cols * bw + 12, 56 + rows * bh), (250, 246, 238))
    d = ImageDraw.Draw(s)
    d.text((12, 8), "区分H UIアイコン35点（左から 128・64・48・32px の実寸。48・32px はスマホの一覧サイズ）", font=font(22), fill=(60, 40, 30))
    d.text((12, 36), "乳4・菌5・手入れ6・仕上げ13・毎日の操作7（白地）", font=fs, fill=(110, 90, 80))
    for n, k in enumerate(ids):
        x0, y0 = 8 + (n % cols) * bw, 56 + (n // cols) * bh
        p = X.EX / "H" / f"H{k:02d}.png"
        d.text((x0, y0 + 2), f"{k:02d} {HNAMES[k]}", font=fs, fill=(60, 40, 30))
        if not p.exists():
            continue
        im = Image.open(p).convert("RGBA")
        x = x0
        for sz in (128, 64, 48, 32):
            c = Image.new("RGBA", (sz, sz), (255, 255, 255, 255))
            c.alpha_composite(im.resize((sz, sz), Image.LANCZOS))
            s.paste(c.convert("RGB"), (x, y0 + 22 + 128 - sz))
            x += sz + 8
    s.save(out)


def icon_i(bgid="I1", tag=""):
    """アプリアイコン：I1 の背景＋r01（ごきげん）。文字なし。安全域（中央66%）に収める"""
    bg = Image.open(X.EX / "I" / "raw" / f"{bgid}.png").convert("RGB").resize((1024, 1024), Image.LANCZOS).convert("RGBA")
    body = X.with_face(X.body("r01"), "r01", "smile")
    c = X.crop(body)
    w = 660
    c = c.resize((w, int(c.height * w / c.width)), Image.LANCZOS)
    sh = Image.new("RGBA", bg.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse((512 - 310, 700, 512 + 310, 800), fill=(120, 80, 30, 90))
    sh = sh.filter(ImageFilter.GaussianBlur(14))
    fg = Image.new("RGBA", bg.size, (0, 0, 0, 0))
    fg.alpha_composite(c, (512 - w // 2, 760 - c.height))
    icon = bg.copy()
    icon.alpha_composite(sh)
    icon.alpha_composite(fg)
    icon.convert("RGB").save(X.EX / "I" / f"app_icon{tag}_1024.png")
    bg.convert("RGB").save(X.EX / "I" / f"app_icon{tag}_bg_1024.png")
    fg2 = Image.new("RGBA", bg.size, (0, 0, 0, 0))
    fg2.alpha_composite(sh)
    fg2.alpha_composite(fg)
    fg2.save(X.EX / "I" / f"app_icon{tag}_fg_1024.png")
    return icon.convert("RGB")


def rounded(im, sz, r=0.22):
    im = im.resize((sz, sz), Image.LANCZOS).convert("RGBA")
    m = Image.new("L", (sz * 4, sz * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, sz * 4 - 1, sz * 4 - 1), int(sz * 4 * r), fill=255)
    m = m.resize((sz, sz), Image.LANCZOS)
    out = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
    out.paste(im, (0, 0), m)
    return out


def banner():
    bg = Image.open(X.EX / "I" / "raw" / "I3.png").convert("RGB")
    W0, H0 = bg.size
    ch = int(W0 / 2.048)
    top = 96
    bg = bg.crop((0, top, W0, top + ch)).resize((2048, 1000), Image.LANCZOS).convert("RGBA")   # 2倍で作って最後に 1024x500
    shelf_y = int((0.71 * H0 - top) * 1000 / ch) + 10
    items = [("r36", "normal", 900, 0.30), ("r58", "normal", 1900, 0.26), ("r39", "normal", 1590, 0.28), ("r01", "smile", 1250, 0.40)]
    for cid, ex, cx, wf in items:
        b = X.with_face(X.body(cid), cid, ex)
        c = X.crop(b)
        w = int(2048 * wf * 0.55)
        c = c.resize((w, int(c.height * w / c.width)), Image.LANCZOS)
        bottom = shelf_y + 30
        sh = Image.new("RGBA", bg.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).ellipse((cx - w // 2, bottom - 14, cx + w // 2, bottom + 22), fill=(60, 35, 15, 110))
        bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(8)))
        bg.alpha_composite(c, (cx - w // 2, bottom - c.height))
    return bg.convert("RGB").resize((1024, 500), Image.LANCZOS)


def phone(ic, n_cols, sz, cell, label_font, w, h):
    ph = Image.new("RGB", (w, h), BG)
    pd = ImageDraw.Draw(ph)
    cols = [(240, 240, 240), (150, 180, 220), (230, 170, 120), (170, 210, 160), (210, 160, 200)]
    total = n_cols * 2
    for n in range(total):
        gx, gy = 16 + (n % n_cols) * cell, 20 + (n // n_cols) * (sz + 40)
        if n == 2:
            r = rounded(ic, sz)
        else:
            r = Image.new("RGBA", (sz, sz), cols[n % 5] + (255,))
            m = Image.new("L", (sz, sz), 0)
            ImageDraw.Draw(m).rounded_rectangle((0, 0, sz - 1, sz - 1), int(sz * 0.22), fill=255)
            r.putalpha(m)
        ph.paste(r.convert("RGB"), (gx, gy), r.getchannel("A"))
        pd.text((gx, gy + sz + 4), "うちのチーズ" if n == 2 else "アプリ", font=label_font, fill=(255, 255, 255))
    return ph


def sheet_i(out):
    ic = icon_i("I2", "")  # 10/18 B案(I2)で確定
    ic2 = icon_i("I1", "_A")  # Aは別名で残す
    gb = banner()
    gb.save(X.EX / "I" / "feature_graphic_1024x500_no_text.png")
    fs = font(15)
    s = Image.new("RGB", (1100, 1330), (250, 246, 238))
    d = ImageDraw.Draw(s)
    d.text((12, 8), "区分I アプリアイコン・フィーチャーグラフィック（どちらも文字なし）", font=font(26), fill=(60, 40, 30))
    d.text((12, 46), "アプリアイコン（確定B案：背景＝AI生成 I2／相棒＝r01 ごきげん＋SVGの顔をコードで合成）", font=fs, fill=(60, 40, 30))
    x = 12
    for sz in (256, 192, 96, 48):
        s.paste(ic.resize((sz, sz), Image.LANCZOS), (x, 76 + 256 - sz))
        d.text((x, 340), f"{sz}px", font=fs, fill=(60, 40, 30))
        x += sz + 20
    x = 12 + 4 * 0
    s.paste(ic2.resize((192, 192), Image.LANCZOS), (800, 140))
    s.paste(ic2.resize((48, 48), Image.LANCZOS), (1010, 284))
    d.text((800, 110), "旧A案（背景 I1）", font=fs, fill=(60, 40, 30))
    d.text((12, 372), "端末のホーム画面相当（アイコン96px・角丸／ほかのアプリは仮置きの色）", font=fs, fill=(60, 40, 30))
    s.paste(phone(ic, 5, 96, 120, font(13), 620, 300), (12, 398))
    d.text((660, 372), "同・実寸48px（48dp相当）", font=fs, fill=(60, 40, 30))
    s.paste(phone(ic, 4, 48, 70, font(10), 300, 200), (660, 398))
    d.text((12, 720), "フィーチャーグラフィック 1024×500（左4割は後で文字を載せる余白。文字はPillowで後から）", font=fs, fill=(60, 40, 30))
    s.paste(gb, (12, 748))
    d.text((12, 1262), "アダプティブ用：app_icon_bg_1024.png／app_icon_fg_1024.png（前景は中央66%以内）も出力済み", font=fs, fill=(110, 90, 80))
    s.save(out)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    what = sys.argv[1]
    if what == "post":
        post_h([int(a) for a in sys.argv[2:]] or range(1, 36))
    elif what == "h":
        sheet_h(list(range(1, 36)), X.EX / "一覧_H_UIアイコン_20261017.png")
    elif what == "i":
        sheet_i(X.EX / "一覧_I_アプリアイコン_ストア画像_20261017.png")
