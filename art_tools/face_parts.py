# -*- coding: utf-8 -*-
"""face_parts.py - 性格別の「顔の型」×表情 の SVG 部品（2026-10-17 チーズくん・オーナー案「白いチーズは顔で描き分ける」）

考え方
- **型（faceType）＝目・眉・口・ほっぺの基本形**。各種の「性格」（data.py の性格欄）から8つに分ける（work/顔の型_v1.md）
- **表情（expr）＝型の変形**。目・眉・口を「型の値（大きさ・間隔・眉の角度）を受け継いだまま」差し替える。
  なので10表情はどの型にも乗り、同じ子に見える（例：ツンデレの笑顔は眉が少しつり上がったまま）
- 形の数値は face_style.json の "types" に置く（アプリも同じ値・同じ式で描く）。ここでは数値から図形の一覧を作り、
  Pillow（確認シート）と SVG（アプリの部品）の両方に同じ図形を出す
- 座標：顔の中心(0,0)・顔の幅＝1000（右・下が正）。線の太さ lw は face_preview.py が体の主線（画像の幅の13‰）から計算して渡す

表情（10＋1）：normal 通常／smile 笑顔／shy 照れ（目線をそらす・平ら眉・小さな笑み・濃く広いほっぺ。困り眉と波線は使わない）／sulk すね（すね顔。すねすね状態では体を反転した後ろ姿にする＝別）／
  sleep ねむい／surprised 驚き／cry 泣き／proud 得意げ／blink まばたき／talk 口パク／sad しょんぼり（機嫌の5段階で使う・追加）

図形：("fill", path, color, alpha) / ("stroke", path, width, color)。path は [("M",x,y),("L",x,y),("Q",cx,cy,x,y),("C",c1x,c1y,c2x,c2y,x,y),("Z",)]
"""
import math

EXPRS = ["normal", "smile", "shy", "sulk", "sleep", "surprised", "cry", "proud", "blink", "talk", "sad"]
EXPR_JA = {"normal": "通常", "smile": "笑顔", "shy": "照れ", "sulk": "すね", "sleep": "ねむい", "surprised": "驚き",
           "cry": "泣き", "proud": "得意げ", "blink": "まばたき", "talk": "口パク", "sad": "しょんぼり"}
K = 0.5523  # 円を4本の3次ベジェで近似する係数


# ---------- 形の部品 ----------
def ellipse(cx, cy, rx, ry):
    return [("M", cx + rx, cy),
            ("C", cx + rx, cy + ry * K, cx + rx * K, cy + ry, cx, cy + ry),
            ("C", cx - rx * K, cy + ry, cx - rx, cy + ry * K, cx - rx, cy),
            ("C", cx - rx, cy - ry * K, cx - rx * K, cy - ry, cx, cy - ry),
            ("C", cx + rx * K, cy - ry, cx + rx, cy - ry * K, cx + rx, cy), ("Z",)]


def lower_half(cx, cy, rx, ry, lid=0):
    """下半分の楕円（上を水平に切った目）。lid＝切る高さ（中心から下へ）"""
    # 切る線の y で楕円の幅
    t = min(max(lid / ry, -0.95), 0.95) if ry else 0
    hx = rx * math.sqrt(1 - t * t)
    y0 = cy + lid
    return [("M", cx - hx, y0), ("C", cx - hx, y0 + (ry - lid) * 1.25, cx + hx, y0 + (ry - lid) * 1.25, cx + hx, y0), ("Z",)]


def arc(cx, cy, rx, h):
    """弧（h>0 で下にふくらむ＝U、h<0 で上にふくらむ＝∩）"""
    return [("M", cx - rx, cy), ("Q", cx, cy + 2 * h, cx + rx, cy)]


def line(x1, y1, x2, y2):
    return [("M", x1, y1), ("L", x2, y2)]


def sparkle(cx, cy, r):
    """4つ角のきらり（白）"""
    k = r * 0.28
    return [("M", cx, cy - r), ("Q", cx + k, cy - k, cx + r, cy), ("Q", cx + k, cy + k, cx, cy + r),
            ("Q", cx - k, cy + k, cx - r, cy), ("Q", cx - k, cy - k, cx, cy - r), ("Z",)]


def mouth_open(cx, cy, rx, ry):
    """D形の開いた口（上が平ら）"""
    return [("M", cx - rx, cy), ("C", cx - rx, cy + ry * 1.33, cx + rx, cy + ry * 1.33, cx + rx, cy), ("Z",)]


def wavy(cx, cy, rx, amp, n=2):
    """波線の口（泣き・点目の型の通常）。照れでは使わない（2026-10-17）"""
    pts = [("M", cx - rx, cy)]
    seg = 2 * rx / (2 * n)
    for i in range(2 * n):
        x0 = cx - rx + seg * i
        pts.append(("Q", x0 + seg / 2, cy + (amp if i % 2 == 0 else -amp), x0 + seg, cy))
    return pts


def omega(cx, cy, rx, h):
    """ω の口（得意げ・ねむい）"""
    return [("M", cx - rx, cy - h * 0.3), ("Q", cx - rx / 2, cy + h * 1.6, cx, cy), ("Q", cx + rx / 2, cy + h * 1.6, cx + rx, cy - h * 0.3)]


def tear(cx, cy, r):
    return [("M", cx, cy - r * 1.4), ("C", cx + r * 0.2, cy - r * 0.6, cx + r, cy - r * 0.1, cx + r, cy + r * 0.4),
            ("C", cx + r, cy + r * 1.1, cx - r, cy + r * 1.1, cx - r, cy + r * 0.4),
            ("C", cx - r, cy - r * 0.1, cx - r * 0.2, cy - r * 0.6, cx, cy - r * 1.4), ("Z",)]


# ---------- 型の基本形 ----------
def _eye_open(t, sx, x, y, scale=1.0, look=0):
    """型ごとの開いた目。sx＝左右（-1 左目・1 右目）。look＝黒目を横にずらす量（すねの横目）"""
    out = []
    ec, hl = t["_eyeColor"], t["_hl"]
    st = t["eye"]
    rx, ry = st["rx"] * scale, st["ry"] * scale
    x += look
    if st["shape"] in ("round", "tall"):
        out.append(("fill", ellipse(x, y, rx, ry), ec, 255))
    elif st["shape"] == "half":                       # 半目（上まぶた）
        out.append(("fill", lower_half(x, y, rx, ry, -ry * st.get("lid", 0) // 1000), ec, 255))
    elif st["shape"] == "dot":
        out.append(("fill", ellipse(x, y, rx, ry), ec, 255))
    elif st["shape"] == "itome":                      # 糸目：ゆるい ∩ の線だけ
        out.append(("stroke", arc(x, y, rx, -ry), t["_lw"], t["_line"]))
        return out
    hls = st.get("hl", "one")
    if hls == "one":
        out.append(("fill", ellipse(x + rx * 0.32, y - ry * 0.34, rx * 0.34, ry * 0.34), hl, 255))
    elif hls == "two":
        out.append(("fill", ellipse(x + rx * 0.30, y - ry * 0.32, rx * 0.38, ry * 0.38), hl, 255))
        out.append(("fill", ellipse(x - rx * 0.34, y + ry * 0.40, rx * 0.16, ry * 0.16), hl, 255))
    elif hls == "wet":                                # うるうる：大きな光＋下に横長の光
        out.append(("fill", ellipse(x + rx * 0.28, y - ry * 0.30, rx * 0.42, ry * 0.42), hl, 255))
        out.append(("fill", ellipse(x - rx * 0.05, y + ry * 0.52, rx * 0.50, ry * 0.16), hl, 220))
    elif hls == "star":
        out.append(("fill", sparkle(x + rx * 0.22, y - ry * 0.25, rx * 0.62), hl, 255))
        out.append(("fill", ellipse(x - rx * 0.38, y + ry * 0.42, rx * 0.15, ry * 0.15), hl, 255))
    elif hls == "small":
        out.append(("fill", ellipse(x + rx * 0.30, y - ry * 0.30, rx * 0.28, ry * 0.28), hl, 255))
    if st["shape"] == "half":                         # まぶたの線（型の目の幅より少し長く）
        ly = y - ry * st.get("lid", 0) // 1000
        tilt = st.get("lidTilt", 0)                   # ＋で外側が下がる（ねむそう）・−で外側が上がる（つり目）
        out.append(("stroke", line(x - sx * rx * 1.15, ly - tilt, x + sx * rx * 1.15, ly + tilt), t["_lw"], t["_line"]))
    if st.get("lash"):                                # つり目の目じり（ツンデレ）
        out.append(("stroke", line(x + sx * rx * 0.55, y - ry * 0.95, x + sx * rx * 1.35, y - ry * 1.45), t["_lw"], t["_line"]))
    return out


def _brows(t, y_shift=0, mode=None):
    """眉。mode：None＝型のまま／'worry'＝ハの字（内側が上）／'angry'＝逆ハ（内側が下）／'up'＝高く上げる"""
    b = t.get("brow")
    gx = t["eyeGap"] // 2
    by = t["eyeY"] - t["eye"]["ry"] - (b["gap"] if b else 90) + y_shift
    w = (b["w"] if b else 110)
    lw = t["_lw"] * ((b.get("thick", 1000) if b else 1000)) // 1000
    if mode == "shy":                                  # 照れ：困り眉にしない（平ら〜少し上げる・つり眉は弱める）
        if not b:
            return []                                  # 眉のない型は眉を足さない（足すと困り眉に見えやすい）
        sp = t["_shy"]
        ang = min(max(b["angle"], sp["browMinAngle"]), sp["browMaxAngle"])
        curve = min(b.get("curve", 0), sp["browCurve"])
        by -= sp["browRaise"]
    elif mode is None:
        if not b:
            return []
        ang = b["angle"]        # ＋で内側が上（ハの字）・−で内側が下（つり眉）
        curve = b.get("curve", 0)
    else:
        ang = {"worry": 70, "angry": -70, "up": 0}[mode] if not b else {
            "worry": max(b["angle"], 0) + 60, "angry": min(b["angle"], 0) - 60, "up": b["angle"]}[mode]
        curve = (b.get("curve", 0) if b else -20)
        if mode == "up":
            by -= 60
    out = []
    for sx in (-1, 1):
        cx = sx * gx
        xi, xo = cx - sx * w // 2, cx + sx * w // 2    # 内側・外側
        yi, yo = by - ang // 2, by + ang // 2
        p = [("M", xi, yi), ("Q", (xi + xo) / 2, (yi + yo) / 2 + curve, xo, yo)]
        out.append(("stroke", p, lw, t["_line"]))
    return out


def _cheeks(t, extra_alpha=0, hatch=False, puff=False, shy=False):
    """ほっぺ。shy＝照れ：大きく・濃く（face_style.json の exprShy）、斜線は4本"""
    c = t["cheek"]
    out = []
    sp = t.get("_shy") or {}
    for sx in (-1, 1):
        x = sx * c["x"]
        rx = c["rx"] * (1250 if puff else 1000) // 1000
        ry = c["ry"]
        if shy:
            rx = c["rx"] * sp["cheekScaleX"] // 1000
            ry = c["ry"] * sp["cheekScaleY"] // 1000
            x = sx * (c["x"] - sp["cheekInset"])
        col = sp.get("cheekColor", t["_cheekColor"]) if shy else t["_cheekColor"]
        out.append(("fill", ellipse(x, c["y"], rx, ry), col, min(255, c["alpha"] + extra_alpha)))
        if hatch or c.get("hatch"):
            idx = (-1.5, -0.5, 0.5, 1.5) if shy else (-1, 0, 1)
            step = rx * 0.30 if shy else c["rx"] * 0.42
            for i in idx:
                hx = x + i * step
                out.append(("stroke", line(hx + 18, c["y"] - ry * 0.45, hx - 18, c["y"] + ry * 0.45),
                            t["_lw"] * 6 // 10, t["_hatch"]))
    return out


def _mouth_normal(t, my):
    m = t["mouth"]
    lw, lc = t["_lw"], t["_line"]
    s, w = m["shape"], m["w"]
    if s == "u":
        return [("stroke", arc(0, my, w // 2, m.get("h", w // 4)), lw, lc)]
    if s == "wide":
        return [("stroke", [("M", -w // 2, my - 10), ("Q", 0, my + m.get("h", 40) * 2, w // 2, my - 10)], lw, lc)]
    if s == "open":
        return [("fill", mouth_open(0, my - w // 8, w // 2, m.get("h", w // 3)), t["_mouthColor"], 255),
                ("stroke", mouth_open(0, my - w // 8, w // 2, m.get("h", w // 3)), lw, lc)]
    if s == "wavy":
        return [("stroke", wavy(0, my, w // 2, m.get("h", 22)), lw, lc)]
    if s == "he":       # への字（ツンデレのむっ）
        return [("stroke", arc(0, my + 10, w // 2, -m.get("h", 18)), lw, lc)]
    if s == "flat":
        return [("stroke", [("M", -w // 2, my), ("Q", 0, my + m.get("h", 12) * 2, w // 2, my)], lw, lc)]
    if s == "omega":
        return [("stroke", omega(0, my, w // 2, m.get("h", 30)), lw, lc)]
    raise ValueError(s)


# ---------- 表情（型の変形） ----------
def shapes(face_type, expr, style, lw):
    """face_type（style["types"] のキー）× expr の図形の一覧"""
    t = dict(style["types"][face_type])
    t["_lw"] = lw
    t["_line"] = style["lineColor"]
    t["_eyeColor"] = style["eyeColor"]
    t["_hl"] = style["highlightColor"]
    t["_cheekColor"] = style["cheekColor"]
    t["_hatch"] = style.get("cheekHatchColor", "#D9776B")
    t["_mouthColor"] = style.get("mouthColor", "#964646")
    t["_shy"] = style["exprShy"]
    gx, ey = t["eyeGap"] // 2, t["eyeY"]
    erx, ery = t["eye"]["rx"], t["eye"]["ry"]
    my = t["mouth"]["y"]
    mw = t["mouth"]["w"]
    out = []
    # ほっぺ（いちばん下に描く）
    out += _cheeks(t, extra_alpha={"shy": t["_shy"]["cheekAlphaAdd"], "smile": 30, "proud": 20, "cry": 30, "sulk": 40}.get(expr, 0),
                   hatch=expr == "shy", puff=expr == "sulk", shy=expr == "shy")
    closed_w = max(erx, 70) * 11 // 10                  # 閉じた目の幅（型の目の大きさを受け継ぐ）
    if expr in ("normal", "talk"):
        for sx in (-1, 1):
            out += _eye_open(t, sx, sx * gx, ey)
        out += _brows(t)
    elif expr == "smile":                               # 目＝にっこり ∩
        for sx in (-1, 1):
            out.append(("stroke", arc(sx * gx, ey + closed_w // 4, closed_w, -closed_w * 6 // 10), lw, t["_line"]))
        out += _brows(t, y_shift=-20)
    elif expr == "proud":                               # 目＝半目（得意げに見下ろす）＋眉を上げる
        for sx in (-1, 1):
            x = sx * gx
            out.append(("fill", lower_half(x, ey, max(erx, 60), max(ery, 60), max(ery, 60) * 2 // 10), t["_eyeColor"], 255))
            out.append(("stroke", line(x - max(erx, 60) * 1.15, ey + max(ery, 60) * 0.2, x + max(erx, 60) * 1.15, ey + max(ery, 60) * 0.2), lw, t["_line"]))
        out += _brows(t, mode="up")
    elif expr == "sulk":                                # 目＝半目の横目・眉は寄せる
        for sx in (-1, 1):
            x = sx * gx
            r = max(erx, 60)
            out.append(("fill", lower_half(x + r * 0.35, ey, r * 0.8, r, -r * 1 // 10), t["_eyeColor"], 255))
            out.append(("stroke", line(x - r * 1.1, ey - r * 0.12 + sx * 8, x + r * 1.1, ey - r * 0.12 - sx * 8), lw, t["_line"]))
        out += _brows(t, mode="angry", y_shift=20)
    elif expr in ("sleep", "blink"):                    # 目＝閉じた U（ねむい）／ほぼ一直線（まばたき）
        for sx in (-1, 1):
            h = closed_w * 4 // 10 if expr == "sleep" else closed_w // 8
            out.append(("stroke", arc(sx * gx, ey + (20 if expr == "sleep" else 0), closed_w, h), lw, t["_line"]))
        out += _brows(t, y_shift=25 if expr == "sleep" else 0)
    elif expr == "surprised":
        for sx in (-1, 1):
            r = max(erx, ery, 70) * 13 // 10
            x = sx * gx
            out.append(("fill", ellipse(x, ey, r * 9 // 10, r), t["_eyeColor"], 255))
            out.append(("fill", ellipse(x + r * 0.3, ey - r * 0.32, r * 0.3, r * 0.3), t["_hl"], 255))
        out += _brows(t, mode="up")
    elif expr == "cry":                                 # 目＝ぎゅっと閉じた ∩ ＋涙、眉はハの字
        for sx in (-1, 1):
            out.append(("stroke", arc(sx * gx, ey, closed_w, -closed_w * 4 // 10), lw, t["_line"]))
            out.append(("fill", tear(sx * (gx + closed_w * 6 // 10), ey + closed_w * 1.1, max(erx, 60) * 4 // 10),
                        style.get("tearColor", "#8CC8F0"), 235))
        out += _brows(t, mode="worry", y_shift=10)
    elif expr == "shy":                                 # 照れ（2026-10-17 作り直し）：目線を横にそらす・眉は平ら〜少し上げ
        sp = t["_shy"]                                  # 旧：目を下げてハの字眉＋波線の口 → しょんぼり・泣きと同じ系統に見えた
        look = max(erx, 40) * sp["lookPermille"] // 1000
        for sx in (-1, 1):
            out += _eye_open(t, sx, sx * gx, ey - sp["eyeLift"], scale=sp["eyeScale"] / 1000, look=look)
        out += _brows(t, mode="shy")
    elif expr == "sad":
        for sx in (-1, 1):
            out += _eye_open(t, sx, sx * gx, ey + 25, scale=0.92)
        out += _brows(t, mode="worry", y_shift=15)
    # 口
    lc = t["_line"]
    if expr in ("normal", "blink"):
        out += _mouth_normal(t, my)
    elif expr == "smile":
        r = max(mw, 150) // 2
        out += [("fill", mouth_open(0, my - 10, r, r * 7 // 10), t["_mouthColor"], 255),
                ("stroke", mouth_open(0, my - 10, r, r * 7 // 10), lw, lc)]
    elif expr == "talk":
        r = max(mw, 140) * 4 // 10
        out += [("fill", ellipse(0, my + 10, r, r * 8 // 10), t["_mouthColor"], 255),
                ("stroke", ellipse(0, my + 10, r, r * 8 // 10), lw, lc)]
    elif expr == "surprised":
        out += [("fill", ellipse(0, my + 20, 55, 70), t["_mouthColor"], 255), ("stroke", ellipse(0, my + 20, 55, 70), lw, lc)]
    elif expr == "proud":
        out += [("stroke", omega(0, my, max(mw, 150) // 2, 28), lw, lc)]
    elif expr == "sulk":                                # とがらせた口（小さな への字）
        out += [("stroke", arc(0, my + 15, 55, -22), lw, lc)]
    elif expr == "sleep":
        out += [("fill", ellipse(0, my + 15, 34, 30), t["_mouthColor"], 255), ("stroke", ellipse(0, my + 15, 34, 30), lw, lc)]
    elif expr == "cry":
        out += [("fill", mouth_open(0, my + 40, 75, -60), t["_mouthColor"], 255), ("stroke", wavy(0, my + 10, 80, 18), lw, lc)]
    elif expr == "shy":                                 # 小さな閉じた笑み（∪）。目線と同じ側へ少し寄せる
        sp = t["_shy"]
        out += [("stroke", arc(sp["mouthShift"], my, sp["mouthW"] // 2, sp["mouthH"]), lw, lc)]
    elif expr == "sad":
        out += [("stroke", arc(0, my + 30, max(mw, 120) // 2, -35), lw, lc)]
    return out


# ---------- 描画（Pillow／SVG） ----------
def flatten(path, steps=18):
    """パスを点列（部分パスごと）に直す"""
    subs, cur, pos = [], [], (0, 0)
    for c in path:
        op = c[0]
        if op == "M":
            if cur:
                subs.append(cur)
            pos = (c[1], c[2])
            cur = [pos]
        elif op == "L":
            pos = (c[1], c[2])
            cur.append(pos)
        elif op == "Q":
            x0, y0 = pos
            for i in range(1, steps + 1):
                u = i / steps
                cur.append(((1 - u) ** 2 * x0 + 2 * (1 - u) * u * c[1] + u * u * c[3],
                            (1 - u) ** 2 * y0 + 2 * (1 - u) * u * c[2] + u * u * c[4]))
            pos = (c[3], c[4])
        elif op == "C":
            x0, y0 = pos
            for i in range(1, steps + 1):
                u = i / steps
                a, b, cc, d = (1 - u) ** 3, 3 * (1 - u) ** 2 * u, 3 * (1 - u) * u * u, u ** 3
                cur.append((a * x0 + b * c[1] + cc * c[3] + d * c[5], a * y0 + b * c[2] + cc * c[4] + d * c[6]))
            pos = (c[5], c[6])
        elif op == "Z":
            pass
    if cur:
        subs.append(cur)
    return subs


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def draw_pillow(draw, items, P, k):
    """draw：ImageDraw（RGBA）、P(x,y)：顔座標→画素、k：顔の1単位の画素数"""
    for it in items:
        if it[0] == "fill":
            _, path, col, al = it
            for sub in flatten(path):
                draw.polygon([P(x, y) for x, y in sub], fill=hex2rgb(col) + (al,))
        else:
            _, path, w, col = it
            wpx = max(1, int(round(w * k)))
            c = hex2rgb(col) + (255,)
            for sub in flatten(path):
                pts = [P(x, y) for x, y in sub]
                draw.line(pts, fill=c, width=wpx, joint="curve")
                r = wpx / 2
                for (px, py) in (pts[0], pts[-1]):
                    draw.ellipse((px - r, py - r, px + r, py + r), fill=c)


def _num(v):
    return str(int(round(v)))


def to_svg(items, size=1000, extra_attr=""):
    c = size // 2
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}"{extra_attr}>']
    for it in items:
        d = []
        for cmd in it[1]:
            op = cmd[0]
            if op == "Z":
                d.append("Z")
            else:
                vals = cmd[1:]
                d.append(op + " ".join(_num(v + c) for v in vals))
        dstr = " ".join(d)
        if it[0] == "fill":
            al = it[3]
            op_attr = "" if al >= 255 else f' fill-opacity="{al * 1000 // 255 / 1000}"'
            parts.append(f'<path d="{dstr}" fill="{it[2]}"{op_attr}/>')
        else:
            parts.append(f'<path d="{dstr}" fill="none" stroke="{it[3]}" stroke-width="{_num(it[2])}" '
                         f'stroke-linecap="round" stroke-linejoin="round"/>')
    parts.append("</svg>")
    return "\n".join(parts)
