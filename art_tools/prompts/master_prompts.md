# うちのチーズ マスター候補 5組の指示文（正本）

- 作成：2026-10-14 チーズくん（案）。選ぶ人：町野佳秀（オーナー）
- 状態：**未生成**（お金の出る操作はしていない。生成は Gemini 残高の扱いをオーナーが決めてから）
- 根拠：`D:/claude/チーズ育成/work/絵の制作計画_v2.md` §1・§2（区分A）、`相棒チーズ_仕様_v2.md`（最初の相棒＝チュートリアルのクリームチーズ r01）、decision-log 2026-10-14（顔＝体はAI・顔はSVG部品／最終段階だけ顔までAI／画像AI＝Gemini）
- 書き方はうぱ絵くんの `D:/claude/ウーパーちゃん/work/マスター画像_指示文.md` に合わせた（英文・見え方で書く・数値と色HEX・NGを明記）
- `gen_master.py` はこのファイルの `<!-- prompt: 組/面 -->` 直後の ```text ブロックを読む。直すときはここを直す（送った文は出力先の `*_prompt.txt` に残る）

## 0. 全体の作り

| 項目 | 内容 |
|---|---|
| 組数×面 | 5組 × 3面（buddy＝相棒のクリームチーズ／soft＝白カビの小さな円盤／wheel＝大きなハードのホイール）＝15枚・2K |
| 組ごとに変えるもの | 絵柄だけ（線の色と太さ・塗り・質感）。形・色HEX・構図は全組同じ |
| 3面にした理由 | 相棒（最初の1体・一番長く見る）／ふわふわの表面（白カビ・青カビ・ワイルド度の描き方の見本）／大きくて硬い形と皮と断面（ハード・セミハードの見本）。この3つで図鑑82種の描き方がほぼ決まる |
| 顔 | **描かせない**（目・口・鼻・まゆ・ほっぺ無し）。顔はアプリの SVG 部品で重ねる。前面の上寄りに「顔を置ける平らで静かな面」を残させる |
| 背景 | **単色マゼンタ #FF00FF・床なし・影なし**（`cut_bg.py` で抜く）。チーズの側にピンク・紫を使わせない |
| 構図 | 1:1・1体を中央・幅の約70%・やや上から（約20度）の3/4 |
| 作る順 | 各組で buddy（参照なし）→ soft（buddy を参照）→ wheel（buddy＋soft を参照）。後の面は前の面の絵柄に合わせる |
| 共通の禁止文 | `gen_panel.py` が末尾に足す（文字・ロゴ・認証マーク・実在商品・他作品なし） |
| 費用 | 2K 1回 674（1/10,000 USD・出力504＋上乗せ170）×15＝10,110 → 1.0110 USD ≒ 151円（150円/USD仮定）。全部が上限の4回でも 674×60＝40,440 → 4.0440 USD ≒ 606円 |

### オーナーに見てもらう点
- 5組から1組（または「組2の質感で組3の線」のような混ぜ指定。その場合は §6 の形で指示文を足して `gen_mix.py` で作る）
- 比較シートは `make_compare.py --with-face`：相棒の右に「SVGの顔を重ねた見本」を並べる（顔の線と体の線が合うかを見る）
- 組4（輪郭うすめ）は SVG の顔の線と合わせにくい。選ぶなら顔の部品も線なし（塗りだけ）にする
- 選んだ組の3枚を `D:/claude/チーズ育成/art/master/` に固定し、以後の生成はすべてこれを参照にする

---

## 組1：ゆるい細線・やさしい平塗り

<!-- prompt: 1/buddy -->
```text
Original illustration of a cheese as a cute pet object (not based on any existing character, mascot or product).
Subject: one palm-sized fresh cream cheese shaped like a soft plump rounded cube with very rounded, slightly sagging edges and a gently domed top, like a soft dumpling of cream cheese. Milky white (#FFFDF6) with warm cream shading (#EFE6D2). Smooth, slightly glossy, moist surface with one gentle swirl mark on the top. No rind, no holes. It sits by itself and is a little squishy at the bottom.
No face: do not draw eyes, mouth, nose, eyebrows, blush or any facial features. The upper middle of the front side is a broad, smooth, calm area with no pattern (a face will be added later by the app).
Art style: soft Japanese "yuru-kawa" illustration for a relaxing game for adults. Thin, slightly wobbly hand-drawn warm brown outlines (#6E4E3A), never black and never thick. Soft flat pastel colors with one simple step of shading. Very few details, calm and cozy mood.
View: three-quarter view from slightly above (about 20 degrees), the front side facing the viewer.
Composition: square 1:1 image. One single cheese centered, about 70% of the image width, with a comfortable margin on every side. No plate, no knife, no packaging, no label, no box, no other objects.
Background: one flat solid pure magenta color (#FF00FF) filling the whole background, completely uniform, no gradient, no texture, no floor, no shadow, no contact shadow, no reflection. Do not use pink, magenta or purple anywhere on the cheese.
```

<!-- prompt: 1/soft -->
```text
Use exactly the same art style as image 1 (outline color and thickness, shading steps, texture, level of detail). Do not copy the shape of image 1.
Original illustration of a cheese as a cute pet object (not based on any existing character, mascot or product).
Subject: one small round flat disc of soft-ripened white-mold cheese, palm-sized, its height about one third of its diameter, with slightly bulging rounded sides. Covered with a velvety, fluffy snow-white bloomy rind (#FAF8F1) with very subtle cream shadows (#EDE4CF); the rind looks soft and downy like a little felt. A whole uncut wheel: no cut, no wedge removed.
No face: do not draw eyes, mouth, nose, eyebrows, blush or any facial features. The front of the side and the near part of the top are smooth and calm (a face will be added later by the app).
Art style: soft Japanese "yuru-kawa" illustration for a relaxing game for adults. Thin, slightly wobbly hand-drawn warm brown outlines (#6E4E3A), never black and never thick. Soft flat pastel colors with one simple step of shading. Very few details, calm and cozy mood.
View: three-quarter view from slightly above (about 20 degrees).
Composition: square 1:1 image. One single cheese centered, about 70% of the image width, with a comfortable margin on every side. No plate, no knife, no packaging, no wooden box, no label, no other objects.
Background: one flat solid pure magenta color (#FF00FF) filling the whole background, completely uniform, no gradient, no texture, no floor, no shadow, no contact shadow, no reflection. Do not use pink, magenta or purple anywhere on the cheese.
```

<!-- prompt: 1/wheel -->
```text
Use exactly the same art style as images 1 and 2 (outline color and thickness, shading steps, texture, level of detail). Do not copy their shapes.
Original illustration of a cheese as a cute pet object (not based on any existing character, mascot or product).
Subject: one large whole wheel of long-aged hard cheese, wide and drum-shaped (height about one third of the diameter). Firm, smooth natural rind in golden straw color (#D2A65A) with darker amber-brown edges (#9C6B2E). One small wedge is cut out at the front right, showing the pale yellow interior (#F3DC92) with a few tiny white crystal dots. No holes. No markings, no stamps, no dots pattern, no lettering anywhere on the rind.
No face: do not draw eyes, mouth, nose, eyebrows, blush or any facial features. The rind on the front left of the cut is a broad, smooth, calm area (a face will be added later by the app).
Art style: soft Japanese "yuru-kawa" illustration for a relaxing game for adults. Thin, slightly wobbly hand-drawn warm brown outlines (#6E4E3A), never black and never thick. Soft flat pastel colors with one simple step of shading. Very few details, calm and cozy mood.
View: three-quarter view from slightly above (about 20 degrees).
Composition: square 1:1 image. One single cheese centered, about 70% of the image width, with a comfortable margin on every side. No board, no knife, no packaging, no label, no other objects; the cut-out wedge is not shown.
Background: one flat solid pure magenta color (#FF00FF) filling the whole background, completely uniform, no gradient, no texture, no floor, no shadow, no contact shadow, no reflection. Do not use pink, magenta or purple anywhere on the cheese.
```

---

## 組2：絵本の水彩

<!-- prompt: 2/buddy -->
```text
Original illustration of a cheese as a cute pet object (not based on any existing character, mascot or product).
Subject: one palm-sized fresh cream cheese shaped like a soft plump rounded cube with very rounded, slightly sagging edges and a gently domed top, like a soft dumpling of cream cheese. Milky white (#FFFDF6) with warm cream shading (#EFE6D2). Smooth, slightly glossy, moist surface with one gentle swirl mark on the top. No rind, no holes. It sits by itself and is a little squishy at the bottom.
No face: do not draw eyes, mouth, nose, eyebrows, blush or any facial features. The upper middle of the front side is a broad, smooth, calm area with no pattern (a face will be added later by the app).
Art style: gentle picture-book watercolor illustration. Soft watercolor washes with slightly darker pooled edges and a faint paper grain, a delicate thin brown colored-pencil outline (#7A5A44) that is lightly broken in places. Two soft steps of shading with warm light from the upper left. Quiet, warm, nostalgic mood.
View: three-quarter view from slightly above (about 20 degrees), the front side facing the viewer.
Composition: square 1:1 image. One single cheese centered, about 70% of the image width, with a comfortable margin on every side. No plate, no knife, no packaging, no label, no box, no other objects.
Background: one flat solid pure magenta color (#FF00FF) filling the whole background, completely uniform, no gradient, no texture, no paper texture in the background, no floor, no shadow, no contact shadow, no reflection. Do not use pink, magenta or purple anywhere on the cheese.
```

<!-- prompt: 2/soft -->
```text
Use exactly the same art style as image 1 (outline color and thickness, shading steps, texture, level of detail). Do not copy the shape of image 1.
Original illustration of a cheese as a cute pet object (not based on any existing character, mascot or product).
Subject: one small round flat disc of soft-ripened white-mold cheese, palm-sized, its height about one third of its diameter, with slightly bulging rounded sides. Covered with a velvety, fluffy snow-white bloomy rind (#FAF8F1) with very subtle cream shadows (#EDE4CF); the rind looks soft and downy like a little felt. A whole uncut wheel: no cut, no wedge removed.
No face: do not draw eyes, mouth, nose, eyebrows, blush or any facial features. The front of the side and the near part of the top are smooth and calm (a face will be added later by the app).
Art style: gentle picture-book watercolor illustration. Soft watercolor washes with slightly darker pooled edges and a faint paper grain, a delicate thin brown colored-pencil outline (#7A5A44) that is lightly broken in places. Two soft steps of shading with warm light from the upper left. Quiet, warm, nostalgic mood.
View: three-quarter view from slightly above (about 20 degrees).
Composition: square 1:1 image. One single cheese centered, about 70% of the image width, with a comfortable margin on every side. No plate, no knife, no packaging, no wooden box, no label, no other objects.
Background: one flat solid pure magenta color (#FF00FF) filling the whole background, completely uniform, no gradient, no texture, no paper texture in the background, no floor, no shadow, no contact shadow, no reflection. Do not use pink, magenta or purple anywhere on the cheese.
```

<!-- prompt: 2/wheel -->
```text
Use exactly the same art style as images 1 and 2 (outline color and thickness, shading steps, texture, level of detail). Do not copy their shapes.
Original illustration of a cheese as a cute pet object (not based on any existing character, mascot or product).
Subject: one large whole wheel of long-aged hard cheese, wide and drum-shaped (height about one third of the diameter). Firm, smooth natural rind in golden straw color (#D2A65A) with darker amber-brown edges (#9C6B2E). One small wedge is cut out at the front right, showing the pale yellow interior (#F3DC92) with a few tiny white crystal dots. No holes. No markings, no stamps, no dots pattern, no lettering anywhere on the rind.
No face: do not draw eyes, mouth, nose, eyebrows, blush or any facial features. The rind on the front left of the cut is a broad, smooth, calm area (a face will be added later by the app).
Art style: gentle picture-book watercolor illustration. Soft watercolor washes with slightly darker pooled edges and a faint paper grain, a delicate thin brown colored-pencil outline (#7A5A44) that is lightly broken in places. Two soft steps of shading with warm light from the upper left. Quiet, warm, nostalgic mood.
View: three-quarter view from slightly above (about 20 degrees).
Composition: square 1:1 image. One single cheese centered, about 70% of the image width, with a comfortable margin on every side. No board, no knife, no packaging, no label, no other objects; the cut-out wedge is not shown.
Background: one flat solid pure magenta color (#FF00FF) filling the whole background, completely uniform, no gradient, no texture, no paper texture in the background, no floor, no shadow, no contact shadow, no reflection. Do not use pink, magenta or purple anywhere on the cheese.
```

---

## 組3：太めの輪郭・シール風（小さく表示しても読める・LINEスタンプ向き）

<!-- prompt: 3/buddy -->
```text
Original illustration of a cheese as a cute pet object (not based on any existing character, mascot or product).
Subject: one palm-sized fresh cream cheese shaped like a soft plump rounded cube with very rounded, slightly sagging edges and a gently domed top, like a soft dumpling of cream cheese. Milky white (#FFFDF6) with warm cream shading (#EFE6D2). Smooth, slightly glossy, moist surface with one gentle swirl mark on the top. No rind, no holes. It sits by itself and is a little squishy at the bottom.
No face: do not draw eyes, mouth, nose, eyebrows, blush or any facial features. The upper middle of the front side is a broad, smooth, calm area with no pattern (a face will be added later by the app).
Art style: clean sticker-like kawaii illustration. Bold, smooth, even dark-brown outlines (#4A3426), about 1.5% of the image width, with rounded line ends. Flat colors with two-step cel shading and one small soft highlight. Crisp and simple, easy to read at small sizes like a chat sticker.
View: three-quarter view from slightly above (about 20 degrees), the front side facing the viewer.
Composition: square 1:1 image. One single cheese centered, about 70% of the image width, with a comfortable margin on every side. No plate, no knife, no packaging, no label, no box, no other objects. No white sticker border.
Background: one flat solid pure magenta color (#FF00FF) filling the whole background, completely uniform, no gradient, no texture, no floor, no shadow, no contact shadow, no reflection. Do not use pink, magenta or purple anywhere on the cheese.
```

<!-- prompt: 3/soft -->
```text
Use exactly the same art style as image 1 (outline color and thickness, shading steps, texture, level of detail). Do not copy the shape of image 1.
Original illustration of a cheese as a cute pet object (not based on any existing character, mascot or product).
Subject: one small round flat disc of soft-ripened white-mold cheese, palm-sized, its height about one third of its diameter, with slightly bulging rounded sides. Covered with a velvety, fluffy snow-white bloomy rind (#FAF8F1) with very subtle cream shadows (#EDE4CF); the rind looks soft and downy like a little felt. A whole uncut wheel: no cut, no wedge removed. No swirl, spiral or ring marks on the top (do not copy the swirl of image 1); show the downy texture with a few short soft strokes instead.
No face: do not draw eyes, mouth, nose, eyebrows, blush or any facial features. The front of the side and the near part of the top are smooth and calm (a face will be added later by the app).
Art style: clean sticker-like kawaii illustration. Bold, smooth, even dark-brown outlines (#4A3426), about 1.5% of the image width, with rounded line ends. Flat colors with two-step cel shading and one small soft highlight. Crisp and simple, easy to read at small sizes like a chat sticker.
View: three-quarter view from slightly above (about 20 degrees).
Composition: square 1:1 image. One single cheese centered, about 70% of the image width, with a comfortable margin on every side. No plate, no knife, no packaging, no wooden box, no label, no other objects. No white sticker border.
Background: one flat solid pure magenta color (#FF00FF) filling the whole background, completely uniform, no gradient, no texture, no floor, no shadow, no contact shadow, no reflection. Do not use pink, magenta or purple anywhere on the cheese.
```

<!-- prompt: 3/wheel -->
```text
Use exactly the same art style as images 1 and 2 (outline color and thickness, shading steps, texture, level of detail). Do not copy their shapes.
Original illustration of a cheese as a cute pet object (not based on any existing character, mascot or product).
Subject: one large whole wheel of long-aged hard cheese, wide and drum-shaped (height about one third of the diameter). Firm, smooth natural rind in golden straw color (#D2A65A) with darker amber-brown edges (#9C6B2E). One small wedge is cut out at the front right, showing the pale yellow interior (#F3DC92) with a few tiny white crystal dots. No holes. No markings, no stamps, no dots pattern, no lettering anywhere on the rind.
No face: do not draw eyes, mouth, nose, eyebrows, blush or any facial features. The rind on the front left of the cut is a broad, smooth, calm area (a face will be added later by the app).
Art style: clean sticker-like kawaii illustration. Bold, smooth, even dark-brown outlines (#4A3426), about 1.5% of the image width, with rounded line ends. Flat colors with two-step cel shading and one small soft highlight. Crisp and simple, easy to read at small sizes like a chat sticker.
View: three-quarter view from slightly above (about 20 degrees).
Composition: square 1:1 image. One single cheese centered, about 70% of the image width, with a comfortable margin on every side. No board, no knife, no packaging, no label, no other objects; the cut-out wedge is not shown. No white sticker border.
Background: one flat solid pure magenta color (#FF00FF) filling the whole background, completely uniform, no gradient, no texture, no floor, no shadow, no contact shadow, no reflection. Do not use pink, magenta or purple anywhere on the cheese.
```

---

## 組4：ふんわり厚塗り（輪郭うすめ）

<!-- prompt: 4/buddy -->
```text
Original illustration of a cheese as a cute pet object (not based on any existing character, mascot or product).
Subject: one palm-sized fresh cream cheese shaped like a soft plump rounded cube with very rounded, slightly sagging edges and a gently domed top, like a soft dumpling of cream cheese. Milky white (#FFFDF6) with warm cream shading (#EFE6D2). Smooth, slightly glossy, moist surface with one gentle swirl mark on the top. No rind, no holes. It sits by itself and is a little squishy at the bottom.
No face: do not draw eyes, mouth, nose, eyebrows, blush or any facial features. The upper middle of the front side is a broad, smooth, calm area with no pattern (a face will be added later by the app).
Art style: soft gouache painting, cozy and warm. Almost no outlines: the shapes are defined by color and soft light; where an edge is needed, use only a faint slightly darker edge of the same hue (around #8A6A52 at most). Gentle rounded volume with soft light from the upper left and a warm bounce light from below. Calm, adult, healing mood.
View: three-quarter view from slightly above (about 20 degrees), the front side facing the viewer.
Composition: square 1:1 image. One single cheese centered, about 70% of the image width, with a comfortable margin on every side. No plate, no knife, no packaging, no label, no box, no other objects.
Background: one flat solid pure magenta color (#FF00FF) filling the whole background, completely uniform, no gradient, no texture, no floor, no shadow, no contact shadow, no reflection, no magenta light on the cheese. Do not use pink, magenta or purple anywhere on the cheese.
```

<!-- prompt: 4/soft -->
```text
Use exactly the same art style as image 1 (edges, shading steps, brush texture, level of detail). Do not copy the shape of image 1.
Original illustration of a cheese as a cute pet object (not based on any existing character, mascot or product).
Subject: one small round flat disc of soft-ripened white-mold cheese, palm-sized, its height about one third of its diameter, with slightly bulging rounded sides. Covered with a velvety, fluffy snow-white bloomy rind (#FAF8F1) with very subtle cream shadows (#EDE4CF); the rind looks soft and downy like a little felt. A whole uncut wheel: no cut, no wedge removed.
No face: do not draw eyes, mouth, nose, eyebrows, blush or any facial features. The front of the side and the near part of the top are smooth and calm (a face will be added later by the app).
Art style: soft gouache painting, cozy and warm. Almost no outlines: the shapes are defined by color and soft light; where an edge is needed, use only a faint slightly darker edge of the same hue (around #8A6A52 at most). Gentle rounded volume with soft light from the upper left and a warm bounce light from below. Calm, adult, healing mood.
View: three-quarter view from slightly above (about 20 degrees).
Composition: square 1:1 image. One single cheese centered, about 70% of the image width, with a comfortable margin on every side. No plate, no knife, no packaging, no wooden box, no label, no other objects.
Background: one flat solid pure magenta color (#FF00FF) filling the whole background, completely uniform, no gradient, no texture, no floor, no shadow, no contact shadow, no reflection, no magenta light on the cheese. Do not use pink, magenta or purple anywhere on the cheese.
```

<!-- prompt: 4/wheel -->
```text
Use exactly the same art style as images 1 and 2 (edges, shading steps, brush texture, level of detail). Do not copy their shapes.
Original illustration of a cheese as a cute pet object (not based on any existing character, mascot or product).
Subject: one large whole wheel of long-aged hard cheese, wide and drum-shaped (height about one third of the diameter). Firm, smooth natural rind in golden straw color (#D2A65A) with darker amber-brown edges (#9C6B2E). One small wedge is cut out at the front right, showing the pale yellow interior (#F3DC92) with a few tiny white crystal dots. No holes. No markings, no stamps, no dots pattern, no lettering anywhere on the rind.
No face: do not draw eyes, mouth, nose, eyebrows, blush or any facial features. The rind on the front left of the cut is a broad, smooth, calm area (a face will be added later by the app).
Art style: soft gouache painting, cozy and warm. Almost no outlines: the shapes are defined by color and soft light; where an edge is needed, use only a faint slightly darker edge of the same hue (around #8A6A52 at most). Gentle rounded volume with soft light from the upper left and a warm bounce light from below. Calm, adult, healing mood.
View: three-quarter view from slightly above (about 20 degrees).
Composition: square 1:1 image. One single cheese centered, about 70% of the image width, with a comfortable margin on every side. No board, no knife, no packaging, no label, no other objects; the cut-out wedge is not shown.
Background: one flat solid pure magenta color (#FF00FF) filling the whole background, completely uniform, no gradient, no texture, no floor, no shadow, no contact shadow, no reflection, no magenta light on the cheese. Do not use pink, magenta or purple anywhere on the cheese.
```

---

## 組5：色鉛筆の線・落ち着いた色（大人向けの図鑑らしさ）

<!-- prompt: 5/buddy -->
```text
Original illustration of a cheese as a cute pet object (not based on any existing character, mascot or product).
Subject: one palm-sized fresh cream cheese shaped like a soft plump rounded cube with very rounded, slightly sagging edges and a gently domed top, like a soft dumpling of cream cheese. Milky white (#FFFDF6) with warm cream shading (#EFE6D2). Smooth, slightly glossy, moist surface with one gentle swirl mark on the top. No rind, no holes. It sits by itself and is a little squishy at the bottom.
No face: do not draw eyes, mouth, nose, eyebrows, blush or any facial features. The upper middle of the front side is a broad, smooth, calm area with no pattern (a face will be added later by the app).
Art style: colored-pencil illustration with a gentle hand-drawn line (#5E4636) of medium-thin weight, visible soft pencil strokes in the fills, a muted natural palette slightly desaturated for adults. Two steps of shading. Calm, warm and slightly nostalgic, like a page of an illustrated cheese journal.
View: three-quarter view from slightly above (about 20 degrees), the front side facing the viewer.
Composition: square 1:1 image. One single cheese centered, about 70% of the image width, with a comfortable margin on every side. No plate, no knife, no packaging, no label, no box, no other objects.
Background: one flat solid pure magenta color (#FF00FF) filling the whole background, completely uniform, no gradient, no pencil texture in the background, no floor, no shadow, no contact shadow, no reflection. Do not use pink, magenta or purple anywhere on the cheese.
```

<!-- prompt: 5/soft -->
```text
Use exactly the same art style as image 1 (outline color and thickness, shading steps, texture, level of detail). Do not copy the shape of image 1.
Original illustration of a cheese as a cute pet object (not based on any existing character, mascot or product).
Subject: one small round flat disc of soft-ripened white-mold cheese, palm-sized, its height about one third of its diameter, with slightly bulging rounded sides. Covered with a velvety, fluffy snow-white bloomy rind (#FAF8F1) with very subtle cream shadows (#EDE4CF); the rind looks soft and downy like a little felt. A whole uncut wheel: no cut, no wedge removed.
No face: do not draw eyes, mouth, nose, eyebrows, blush or any facial features. The front of the side and the near part of the top are smooth and calm (a face will be added later by the app).
Art style: colored-pencil illustration with a gentle hand-drawn line (#5E4636) of medium-thin weight, visible soft pencil strokes in the fills, a muted natural palette slightly desaturated for adults. Two steps of shading. Calm, warm and slightly nostalgic, like a page of an illustrated cheese journal.
View: three-quarter view from slightly above (about 20 degrees).
Composition: square 1:1 image. One single cheese centered, about 70% of the image width, with a comfortable margin on every side. No plate, no knife, no packaging, no wooden box, no label, no other objects.
Background: one flat solid pure magenta color (#FF00FF) filling the whole background, completely uniform, no gradient, no pencil texture in the background, no floor, no shadow, no contact shadow, no reflection. Do not use pink, magenta or purple anywhere on the cheese.
```

<!-- prompt: 5/wheel -->
```text
Use exactly the same art style as images 1 and 2 (outline color and thickness, shading steps, texture, level of detail). Do not copy their shapes.
Original illustration of a cheese as a cute pet object (not based on any existing character, mascot or product).
Subject: one large whole wheel of long-aged hard cheese, wide and drum-shaped (height about one third of the diameter). Firm, smooth natural rind in golden straw color (#D2A65A) with darker amber-brown edges (#9C6B2E). One small wedge is cut out at the front right, showing the pale yellow interior (#F3DC92) with a few tiny white crystal dots. No holes. No markings, no stamps, no dots pattern, no lettering anywhere on the rind.
No face: do not draw eyes, mouth, nose, eyebrows, blush or any facial features. The rind on the front left of the cut is a broad, smooth, calm area (a face will be added later by the app).
Art style: colored-pencil illustration with a gentle hand-drawn line (#5E4636) of medium-thin weight, visible soft pencil strokes in the fills, a muted natural palette slightly desaturated for adults. Two steps of shading. Calm, warm and slightly nostalgic, like a page of an illustrated cheese journal.
View: three-quarter view from slightly above (about 20 degrees).
Composition: square 1:1 image. One single cheese centered, about 70% of the image width, with a comfortable margin on every side. No board, no knife, no packaging, no label, no other objects; the cut-out wedge is not shown.
Background: one flat solid pure magenta color (#FF00FF) filling the whole background, completely uniform, no gradient, no pencil texture in the background, no floor, no shadow, no contact shadow, no reflection. Do not use pink, magenta or purple anywhere on the cheese.
```

---

## 6. マスター確定のあと（参考・まだ使わない）

### 6-1. 最終段階（ヴィンテージ）の顔の見本（計画 v2 §2-2・区分 A-3）
土台＝`face_preview.py --vintage --bg #FF00FF` で作った「r01 の体（最終段階の色）＋SVGの顔」。`gen_mix.py --key face/style_a --ref 土台 --ref master/buddy.png --kind vintage --out ...`（参照の1枚目＝土台・2枚目＝マスター）で、顔の描き込み方の候補3案を各1枚作り、オーナーが選ぶ。選んだ案で残りの表情を作る。体は `paste_face.py` で元の画素に戻す。

<!-- prompt: face/style_a -->
```text
Image 1 shows a cheese pet whose simple face is drawn as flat vector parts. Keep the position, size, spacing and expression of the eyes and mouth exactly as in image 1, and keep the body exactly the same.
Repaint only the face as a richer hand-painted face in the art style of image 2: eyes with soft depth and one extra tiny highlight, cheeks with a soft gradation of blush, the mouth line in the same color and thickness as the body outlines. Give a gentle sense of calm maturity and warmth, still cute. Do not add eyebrows, eyelashes, nose or any other features. Background stays flat magenta (#FF00FF).
```

<!-- prompt: face/style_b -->
```text
Image 1 shows a cheese pet whose simple face is drawn as flat vector parts. Keep the position, size, spacing, shapes and expression of the eyes and mouth exactly as in image 1, and keep the body exactly the same.
Only add soft painted shading to the face parts in the art style of image 2 (a slight gradient inside the eyes, a soft rim of light, a slightly blurred blush), so that the face looks hand-painted but almost identical in shape. Do not add any new features. Background stays flat magenta (#FF00FF).
```

<!-- prompt: face/style_c -->
```text
Image 1 shows a cheese pet whose simple face is drawn as flat vector parts. Keep the position, size, spacing and expression of the eyes and mouth exactly as in image 1, and keep the body exactly the same.
Repaint only the face in the art style of image 2 so that it looks like a beloved pet that has grown up: slightly deeper, gentle eyes with a warm reflection, a calm soft smile, a light dignified blush. Keep it simple and cute, readable at small sizes. Do not add eyebrows, eyelashes, nose or any other features. Background stays flat magenta (#FF00FF).
```

### 6-2. r01 特別版の残り3表情（2026-10-17 チーズくん。ふつうは face/style_c を仮採用）
笑顔・ねむいは1回目でAIが体を明るく描き直し顔を拡大した（貼ると楕円が浮く）→ 2回目から冒頭に「編集であって描き直しではない」の1文を足した。しょんぼりも1回目で顔のまわりだけ明るくなった（貼ると楕円が浮く）ため同じ1文を足した。
style_c の文に、表情ごとに「崩してはいけない所」を1文足したもの（閉じ目を開けない・眉を消さない・笑い口を閉じない）。土台＝`face_preview.py --vintage --bg #FF00FF --expr <表情>` の出力。

<!-- prompt: face/v_c_smile -->
```text
This is an edit of image 1, not a new drawing: keep the same framing, the same body size, position, colors and brightness, pixel for pixel outside the face. Do not zoom, move, brighten or redraw the body.
Image 1 shows a cheese pet whose simple face is drawn as flat vector parts. Keep the position, size, spacing and expression of the eyes and mouth exactly as in image 1, and keep the body exactly the same.
Repaint only the face in the art style of image 2 so that it looks like a beloved pet that has grown up: the happy closed eyes stay as the same upward curved lines (do not open them), the small open smiling mouth keeps its shape with a soft warm inside, a light dignified blush. Keep it simple and cute, readable at small sizes. Do not add eyebrows, eyelashes, nose or any other features. Background stays flat magenta (#FF00FF).
```

<!-- prompt: face/v_c_sad -->
```text
This is an edit of image 1, not a new drawing: keep the same framing, the same body size, position, colors and brightness, pixel for pixel outside the face. Do not zoom, move, brighten or redraw the body.
Image 1 shows a cheese pet whose simple face is drawn as flat vector parts. Keep the position, size, spacing and expression of the eyes, eyebrows and mouth exactly as in image 1, and keep the body exactly the same.
Repaint only the face in the art style of image 2 so that it looks like a beloved pet that has grown up and is feeling a little down: slightly deeper, gentle eyes with a warm reflection, the small slanted eyebrows and the small downturned mouth kept exactly as they are, a light blush. No tears. Keep it simple and cute, readable at small sizes. Do not add eyelashes, nose or any other features. Background stays flat magenta (#FF00FF).
```

<!-- prompt: face/v_c_sleep -->
```text
This is an edit of image 1, not a new drawing: keep the same framing, the same body size, position, colors and brightness, pixel for pixel outside the face. Do not zoom, move, brighten or redraw the body.
Image 1 shows a cheese pet whose simple face is drawn as flat vector parts. Keep the position, size, spacing and expression of the eyes and mouth exactly as in image 1, and keep the body exactly the same.
Repaint only the face in the art style of image 2 so that it looks like a beloved pet that has grown up and is sleepy: the eyes stay closed as the same downward curved lines (do not open them, no pupils), the small round mouth kept as it is, a light dignified blush. Keep it simple and cute, readable at small sizes. Do not add eyebrows, eyelashes, nose, sleep bubbles, "Z" letters or any other features. Background stays flat magenta (#FF00FF).
```
