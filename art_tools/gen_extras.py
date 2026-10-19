# -*- coding: utf-8 -*-
"""gen_extras.py - 図鑑の体以外の絵（計画 v2 区分 D/E/F/G/H/I/J/M）を1点ずつ作る（2026-10-17 チーズくん）

- 画風の参照は組3の相棒（master/buddy.png）1枚。--ref で追加（H は最初に合格したアイコンを足して揃える）
- 出力：ART_ROOT/extras/<区分>/raw/<id>.png（マゼンタ背景のまま or 不透明の背景）。透過・検査は post_extras.py
- 作り直しは --redo（旧画像は _tryN に退避）。1点につき初回＋作り直し2回まで（今回の取り決め＝計3回）
- 記録と費用の停止は gen_panel.py（5,000円停止）
使い方：python gen_extras.py --ids D1 D2 [--redo --fix "..."] [--dry-run]
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config as C  # noqa: E402
from runner import run_one  # noqa: E402

EXTRAS = C.ART_ROOT / "extras"
STYLE_REF = C.MASTER_DIR / "buddy.png"
MAX_TRIES = 3   # 初回＋作り直し2回

STYLE = ("Use exactly the same art style as image 1 (bold smooth dark-brown outline #4A3426 with rounded line ends, flat colors, "
         "two-step cel shading, one small soft highlight, sticker-like kawaii look). Do not copy image 1's shape or its cheese color. "
         "Original illustration, not based on any existing character or product.")
MAG = ("Background: one flat solid pure magenta color (#FF00FF) filling the whole background, completely uniform, no gradient, "
       "no texture, no floor, no shadow, no contact shadow. Do not use pink, magenta or purple anywhere on the subject.")
ONE = "Composition: square 1:1 image. {subj_w}. No other objects, no text, no letters, no numbers."

ITEMS = {}


def add(i, cat, subject, size="2K", aspect="1:1", bg="mag", width=70, extra="", no_guard=False):
    if bg == "mag":
        body = (f"{STYLE}\nSubject: {subject}\nComposition: square image, the subject centered, about {width}% of the image width, "
                f"comfortable margin on every side. Nothing else in the image.\n{MAG}")
    elif bg == "white":
        body = f"{STYLE}\nSubject: {subject}\nBackground: flat solid pure white (#FFFFFF), no shadow, no paper texture."
    else:
        body = f"{STYLE}\nScene: {subject}"
    if extra:
        body += "\n" + extra
    ITEMS[i] = dict(cat=cat, size=size, aspect=aspect, prompt=body, no_guard=no_guard)


# ---- D 段階の重ね絵（体の輪郭に沿った切り抜きはコード） ----
add("D1", "D", "an overlay layer of 'newborn downy fuzz': about 70 tiny wispy tufts of very soft pale cream-white peach-fuzz, each tuft made of "
    "3 to 5 short thin curved hair strokes in a warm golden-tan (#C9A77C) color (no outline, no pink, no red), scattered evenly over the whole canvas "
    "with gaps between tufts. Cute and delicate.", bg="white")
add("D2", "D", "an overlay layer of 'vintage crazing': a network of fine hairline cracks like the aged rind of an old cheese, thin dark-brown "
    "(#6B4A32) irregular branching lines of varied length spread over the whole canvas, a few short side branches, calm and elegant, "
    "not scary, no dirt, no color fill.", bg="white")

# ---- E ワイルド度（白カビがふわふわ増える） ----
add("E1", "E", "an overlay layer of 'a little fluffy mold': about 30 small round cotton-puff tufts of soft white mold (#FFFFFF with pale grey-green "
    "#E4EBE2 shading), each tuft a cute fluffy bump with a thin soft outline, scattered over the whole canvas with wide gaps.", width=96)
add("E2", "E", "an overlay layer of 'fluffy mold, medium': about 60 fluffy cotton-puff clumps of soft white mold (#FFFFFF with pale grey-green "
    "#E4EBE2 shading) in mixed sizes, many touching and overlapping, thin soft outline, covering about half of the canvas, cute and soft.", width=96)
add("E3", "E", "an overlay layer of 'very fluffy shaggy mold': dense shaggy fur-like white mold (#FFFFFF with pale grey-green #E4EBE2 shading), "
    "many long soft wispy strands and puffs sticking out in all directions, covering most of the canvas, messy but cute and adorable "
    "(like a dandelion puff or a fluffy sheepdog), not dirty, not gross.", width=96)

# ---- F 着せ替え（背景なし単体・体に重ねるのはコード） ----
add("F1", "F", "a hat made of one big fresh green leaf (#7DBB5A, darker #4F8F3E on the shaded side) folded into a small cap shape with a short curved stem "
    "on top, seen from the front and slightly above, open underneath as if worn on a head, with simple leaf veins. A hat only, no head, no cheese.", width=60)
add("F2", "F", "a tiny white chef's hat (toque): a puffy rounded white top (#FFFFFF with light grey-blue shading #E3E8EE) with soft vertical pleats "
    "above a short plain white band, seen from the front and slightly above, open underneath as if worn on a head. A hat only, no head, no cheese, no text.", width=60)
add("F3", "F", "a small round beret hat in warm burgundy-brown red (#9B3B2E, shading #7A2C22) with a tiny stem nub on top, soft round shape, "
    "seen from the front and slightly above, open underneath as if worn on a head. A hat only, no head, no cheese.", width=60)
add("F4", "F", "a neck ribbon: a cute bow with two short tails and a small center knot, cornflower blue (#5B8FD9, shading #3F6DB5) satin ribbon, "
    "seen straight from the front, with a thin ribbon band extending a little to the left and right of the knot. A ribbon only.", width=62)
add("F5", "F", "a small neckerchief (bandana) tied loosely: a soft triangle of blue-and-white gingham check cloth (#4F7FC9 and white) with the knot at the top "
    "and a pointed tip hanging down, seen from the front. A neckerchief only, no body.", width=60)
add("F6", "F", "a round woven straw mat (like a trivet) seen from slightly above (about 20 degrees): a wide flat oval disc of golden woven straw "
    "(#E8C26B with brown #B98A3C weave lines), thick rounded edge, with a few short straw ends sticking out at the rim. The top is empty (nothing on it).", width=88)
add("F7", "F", "a small round wooden cutting board seen from slightly above (about 20 degrees): a wide flat oval disc of light oak wood (#E3B97A, grain lines "
    "#C08F4F), thick rounded edge, a small round hole near the rim for hanging. The top is empty (nothing on it).", width=88)
add("F8", "F", "a small round cloth doily mat seen from slightly above (about 20 degrees): a wide flat oval of blue-and-white gingham check cloth "
    "(#4F7FC9 and white) with a scalloped ruffled edge. The top is empty (nothing on it).", width=88)

# ---- J UI飾り ----
add("J1", "J", "a ripening shelf board for a cheese cellar: one long horizontal wooden plank (warm brown #B9824A, plank lines and a few knots) seen from the front "
    "and slightly above, with two small iron brackets underneath at both ends, empty top, extending across about 92% of the image width.", width=92)
add("J2", "J", "an empty collection card mount (album page frame): a cream paper card (#FFF3D6) with softly rounded corners, a double-line decorative border in "
    "warm brown, small decorative cheese-hole circles in the four corners, and a plain empty center area. Portrait orientation card, a little tilted paper corner tape at the top. "
    "No text, no picture inside.", width=78)
add("J3", "J", "an empty small wooden display cabinet for showing pets: two shelves, light oak wood (#D9A867) with a darker brown frame, a little roof-like top with "
    "a scalloped trim, seen straight from the front, both shelves empty with a warm cream back wall (#FFF0D0).", width=82)
add("J4", "J", "an empty speech-bubble frame (a rounded balloon with a small tail at the bottom left): warm cream fill (#FFF8E8), thick dark-brown outline, "
    "a soft inner second line in light brown, small cheese-hole dots decorating the top right corner. The inside is completely empty (no text, no letters, no symbols).",
    width=88, no_guard=True)

# ---- M 記念の背景 / G 熟成庫スキン（不透明の背景） ----
add("M1", "M", "a celebration background for a keepsake photo, square: inside a cozy cheese cellar, a warm glowing stone arch, two small hanging lanterns, "
    "small colorful confetti and a few paper streamers falling softly, warm golden light. The center and lower center are a clear empty floor area with soft light, "
    "(a character will be placed there later). No cheese, no characters, no text, no numbers.", bg="scene")
add("G1", "G", "background of a stone ripening cellar, portrait phone screen: arched ceiling and walls of grey-beige stones, empty wooden shelves along both sides, "
    "two small wooden barrels, soft warm lantern light on a cool stone atmosphere. The floor is a flat stone floor starting at about 65% of the height, "
    "with a wide clear empty area in the center where a character will be placed. No cheese, no characters, no text.", size="2K", aspect="9:16", bg="scene")
add("G2", "G", "background of a wooden alpine mountain hut interior, portrait phone screen: honey-colored wooden plank walls, a small window showing a green meadow and "
    "mountains with blue sky, a small wooden bench, a hanging copper pot, warm cozy light. The wooden floor starts at about 65% of the height with a wide clear empty area "
    "in the center where a character will be placed. No cheese, no characters, no text.", size="2K", aspect="9:16", bg="scene")
add("G3", "G", "background of a sunny kitchen window, portrait phone screen: a wide window with a blue-and-white gingham curtain, small green potted herbs on the sill, "
    "soft morning daylight, a light wooden kitchen counter in the foreground starting at about 65% of the height with a wide clear empty area in the center where a "
    "character will be placed. No cheese, no characters, no text.", size="2K", aspect="9:16", bg="scene")

# ---- I アプリアイコン・ストア画像（背景だけAI・チーズはコードで重ねる） ----
add("I1", "I", "an app icon background, square: a smooth warm butter-yellow (#FFE9A8) background with a soft lighter round glow in the center and a few tiny "
    "four-point sparkles near the corners. Completely empty center. No objects, no characters, no cheese, no frame, no border.", bg="scene")
add("I2", "I", "an app icon background, square: a smooth soft cream-to-warm-orange gradient (#FFF3D6 at the top to #F6C27A at the bottom) background with a subtle "
    "arch of warm light behind the center like a cellar window glow, and a few tiny sparkles. Completely empty center. No objects, no characters, no cheese, no frame, no border.", bg="scene")
add("I3", "I", "a wide scene for a store banner (wide landscape): the inside of a cozy stone cheese cellar, warm lantern glow, a long horizontal light-oak wooden shelf plank "
    "running across the lower part of the picture at about 72% of the height and covering the whole width, empty (nothing on it), wooden barrels in the far background. "
    "The left 40% of the picture is a calm, simple, slightly darker wall area with little detail (a title will be placed there later). The right 60% is warm and lively. "
    "No cheese, no characters, no text.", size="2K", aspect="16:9", bg="scene")

# ---- H UIアイコン（1K・マゼンタ背景・35点） ----
ICO_STYLE_NOTE = ("A game UI icon: one single simple object centered, about 68% of the image width. Rounded, chunky and readable even at 48 pixels. "
                  "No text, no letters, no numbers.")


def icon(i, subject, group):
    ITEMS[i] = dict(cat="H", size="1K", aspect="1:1", no_guard=False, group=group,
                    prompt=f"{STYLE}\nSubject: {subject}\n{ICO_STYLE_NOTE}\n{MAG}")


# 乳4
icon("H01", "a cute round cow's head icon: white with two soft brown-black patches, small ivory horns, floppy ears, a light pink-free tan muzzle (no pink), two small dot eyes", "乳")
icon("H02", "a cute goat's head icon: cream-white with two short curved horns, a little pointed beard, small upright ears, two small dot eyes", "乳")
icon("H03", "a cute sheep's head icon: a fluffy cream wool puff on top, a soft grey-beige face, small ears, two small dot eyes", "乳")
icon("H04", "a cute water buffalo's head icon: dark slate grey-brown with big wide-curving crescent horns, broad muzzle, two small dot eyes", "乳")
# 菌5
icon("H05", "an icon meaning 'none / no culture': a small empty glass dish (petri-dish style) with a plain clear empty inside and a tiny sparkle", "菌")
icon("H06", "an icon of white mold: a small round dish containing soft fluffy white fuzz puffs", "菌")
icon("H07", "an icon of blue mold: a small round dish containing soft blue-green veined spots and specks", "菌")
icon("H08", "an icon of washed-rind bacteria: a small round dish containing a glossy orange-red smear with two tiny droplets", "菌")
icon("H09", "an icon of eye-forming bacteria: a small round dish containing a few round bubbles of different sizes", "菌")
# 手入れ6
icon("H10", "an icon meaning 'no care': a small pair of hands palm up, empty, with a tiny sparkle (no objects held)", "手入れ")
icon("H11", "an icon of washing: a small soft cloth being dipped, with three blue water drops", "手入れ")
icon("H12", "an icon of turning over: two curved chunky arrows forming a circle (a flip/rotate symbol) around a small round cheese-colored disc", "手入れ")
icon("H13", "an icon of piercing with a needle: one long silver needle pricking down into a small cheese-colored block, with two tiny air-puff lines", "手入れ")
icon("H14", "an icon of salt: a small round-glass salt shaker with a metal cap and a few white salt crystals falling", "手入れ")
icon("H15", "an icon of kneading and stretching curd: two cartoon hands pulling a long stretchy ribbon of white curd, with a little steam", "手入れ")
# 仕上げ13
icon("H16", "an icon meaning 'plain, no finish': a small plain round cheese-colored disc with a tiny sparkle, nothing wrapped around it", "仕上げ")
icon("H17", "an icon of smoking: three curling grey-brown smoke wisps rising above a small wood-chip pile", "仕上げ")
icon("H18", "an icon of leaves: two fresh green leaves crossed together with veins", "仕上げ")
icon("H19", "an icon of charcoal: two black rough charcoal lumps with a little grey ash dust around them", "仕上げ")
icon("H20", "an icon of straw: a small golden straw bundle tied with a thin string in the middle", "仕上げ")
icon("H21", "an icon of wood: a small round wooden band/ring cut from spruce bark with visible wood grain and a small wooden plank behind it", "仕上げ")
icon("H22", "an icon of sake: a small white ceramic sake bottle with a little round sake cup, a drop falling", "仕上げ")
icon("H23", "an icon of wax: a small block of glossy red wax with a melted drip running down the side (red-orange, not pink)", "仕上げ")
icon("H24", "an icon of cloth wrapping: a small neatly folded piece of off-white cheesecloth with a cross-weave pattern and a bit of string", "仕上げ")
icon("H25", "an icon of cheese mites (Milbenkase style): a small round cheese wheel with a golden-brown rind lightly dusted with fine pale dust, and on it a few (3 to 4) tiny cute round mites with big dot eyes and little stubby legs, like adorable tiny creatures, friendly and smiling, not scary or realistic. The wheel must NOT look like bread, a bun, sugar, a cookie or a sugar cube.", "仕上げ")
icon("H26", "an icon of a heart-shaped mold: a cheese-yellow plump heart shape with a soft highlight", "仕上げ")
icon("H27", "an icon of a pyramid-shaped mold: a cheese-yellow pyramid with the top slightly cut flat, a soft highlight", "仕上げ")
icon("H28", "an icon of a square-shaped mold: a cheese-yellow square block with rounded corners, seen from slightly above, soft highlight", "仕上げ")
# 毎日の操作7
icon("H29", "an icon of petting: a small cute open hand (peach skin tone, no pink) stroking down, with three small curved motion lines", "操作")
icon("H30", "an icon of talking: a round cream-colored speech balloon containing three small dots (no letters)", "操作")
icon("H31", "an icon of feeding: a small glass milk bottle with a white milk drop and a small cap", "操作")
icon("H32", "an icon of grooming a cheese: a round hand brush with a wooden handle and soft bristles, brushing the surface of a small cheese-colored wheel, with three small sparkles and a few brushing motion lines. Not a cloth.", "操作")
icon("H33", "an icon of sleeping: a crescent moon with two small stars and a small folded blanket (no letters)", "操作")
icon("H34", "an icon of sunbathing and chilling: a round orange sun on the left half and a pale-blue snowflake on the right half, split by a soft curved line", "操作")
icon("H35", "an icon of a keepsake photo: a small chunky camera with a round lens and a tiny sparkle", "操作")


def main():
    sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids", nargs="+", required=True)
    ap.add_argument("--ref", action="append", default=[])
    ap.add_argument("--redo", action="store_true")
    ap.add_argument("--fix", default="")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    res = {}
    for i in a.ids:
        it = ITEMS.get(i)
        if not it:
            res[i] = "noitem"
            continue
        out = EXTRAS / it["cat"] / "raw" / f"{i}.png"
        tries = len(list(out.parent.glob(f"{i}_try*.png"))) + (1 if out.exists() else 0)
        if a.redo and tries >= MAX_TRIES:
            print(f"[上限] {i} は既に{tries}回（上限{MAX_TRIES}）。保留")
            res[i] = "limit"
            continue
        p = it["prompt"] + (("\nImportant correction: " + a.fix.strip()) if a.fix else "")
        if it["no_guard"]:
            p += ("\nDo not put any text, letters, numbers, logos, watermarks or certification marks in the image. "
                  "Do not draw any existing product, brand or other works' characters.")
        refs = [STYLE_REF] + [Path(r) for r in a.ref]
        r = run_one(out, p, refs, kind="extra_" + it["cat"], key=i, size=it["size"], redo=a.redo,
                    dry=a.dry_run, aspect=it["aspect"], no_guard=it["no_guard"])
        res[i] = r
        if r in ("nokey", "stop"):
            break
    print("結果：", res)


if __name__ == "__main__":
    main()
