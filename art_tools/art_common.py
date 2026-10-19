# -*- coding: utf-8 -*-
"""art_common.py - 一覧・比較シート用の小さな共通部品（フォント・透過の下に敷く市松模様）

フォントの探し方はうぱ絵くんの upa_common.py と同じ順（Noto Sans JP → 代替）。
"""
import sys
from pathlib import Path

from PIL import Image, ImageFont

HERE = Path(__file__).resolve().parent
FONT_CANDIDATES = [HERE / "fonts" / "NotoSansJP-VF.ttf", Path(r"C:\Windows\Fonts\NotoSansJP-VF.ttf"),
                   Path(r"C:\Windows\Fonts\BIZ-UDGothicB.ttc"), Path(r"C:\Windows\Fonts\YuGothB.ttc"),
                   Path(r"C:\Windows\Fonts\meiryo.ttc")]


def font(size):
    for p in FONT_CANDIDATES:
        if p.is_file():
            f = ImageFont.truetype(str(p), size)
            try:
                f.set_variation_by_axes([700])
            except Exception:
                pass
            return f
    sys.exit("日本語フォントが見つかりません")


def checker(w, h, cell=24, a=(236, 236, 236), b=(255, 255, 255)):
    im = Image.new("RGB", (w, h), b)
    px = im.load()
    for y in range(h):
        for x in range(w):
            if ((x // cell) + (y // cell)) % 2:
                px[x, y] = a
    return im


def on_checker(img, size):
    """透過PNGを市松模様の上に置いて size×size にする（背景が抜けたかを見る）"""
    im = img.convert("RGBA").resize((size, size), Image.LANCZOS)
    bg = checker(size, size).convert("RGBA")
    bg.alpha_composite(im)
    return bg.convert("RGB")
