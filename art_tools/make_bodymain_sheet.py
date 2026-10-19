# -*- coding: utf-8 -*-
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw
sys.path.insert(0, str(Path(__file__).resolve().parent))
import config as C
from art_common import font
import extras_lib as X
def main(out, key="bodyMain"):
    d = json.loads(C.FACES_JSON.read_text(encoding="utf-8"))["faces"]
    ids = list(d); cell = 200; cols = 10
    rows = (len(ids) + cols - 1) // cols
    s = Image.new("RGB", (cols * (cell + 6) + 6, 60 + rows * (cell + 26)), (250, 246, 238))
    dr = ImageDraw.Draw(s); f = font(14)
    dr.text((8, 8), "体の太い部分の矩形（赤）と外接矩形（灰）。N＝首あり印。顔の中心＝青点", font=font(22), fill=(60, 40, 30))
    for n, cid in enumerate(ids):
        print(cid, flush=True); v = d[cid]; x0 = 6 + (n % cols) * (cell + 6); y0 = 60 + (n // cols) * (cell + 26)
        b = X.with_face(X.body(cid), cid, "normal")
        c = Image.new("RGBA", b.size, (236,236,236,255)); c.alpha_composite(b)
        c = c.convert("RGB").resize((cell, cell), Image.LANCZOS)
        g = ImageDraw.Draw(c); k = cell / 1000
        bb = v["bbox"]; g.rectangle([bb[0]*k, bb[1]*k, bb[2]*k, bb[3]*k], outline=(120, 120, 120))
        m = v[key]; g.rectangle([m[0]*k, m[1]*k, m[2]*k, m[3]*k], outline=(220, 30, 30), width=2)
        g.ellipse([v["cx"]*k-3, v["cy"]*k-3, v["cx"]*k+3, v["cy"]*k+3], fill=(30, 60, 220))
        s.paste(c, (x0, y0 + 22))
        dr.text((x0, y0 + 2), f"{cid} {v['name'][:7]}{' N' if v['neck'] else ''}{' *' if v['bodyMain'] != v['bodyMainAuto'] else ''}", font=f, fill=(60, 40, 30))
    s.save(out)
main(sys.argv[1])
