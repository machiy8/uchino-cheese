# うちのチーズ 図鑑の体の指示文（正本・第1便20種）

- 作成：2026-10-16 チーズくん。根拠：`D:/claude/チーズ育成/work/絵の制作計画_v2.md` §3・§4、decision-log 2026-10-16（マスター＝組3・以後は組3の3面を参照に渡す）
- 第1便＝プレイヤーが出会う順（`ヒント設計_v1.md` 付録A の登録日の早い順）の先頭20種。r01 はマスターの相棒（組3 buddy）をそのまま図鑑の体に使う（生成なし）
- `gen_zukan.py` が `<!-- zukan: ID -->` 直後のブロックを読む。ブロックの中身：
  - `key:` 何が見えればそのチーズと分かるか（日本語1行・検査 #6 の基準）
  - `src:` 見た目の根拠（確認日 2026-10-16。一次＝原産地呼称の規程本文、一般＝規程で確かめていない一般的な外観。一般のものは特徴を盛らない）
  - `width:` 体の幅（画像の幅に対する%）
  - `subject:` 被写体（英文）
  - `face:` 顔を置く面（英文）
- 共通の前後の文（絵柄・構図・背景）は `gen_zukan.py` の TEMPLATE。組3の指示文（`master_prompts.md` 3/*）と同じ文を使う
- 図鑑データ（`work/zukan_tools/data.py`）の解説・仕上げと矛盾させない。仕上げ（わら・木・ハート型・ワックス等）は data.py の値どおり描く

<!-- zukan: r02 -->
```text
name: カッテージチーズ
key: 小さな白い粒（カード）がたくさん集まった、ぽろぽろの小山。皮なし
src: 一般（data.py 解説「ぽろぽろした粒々の食感。熟成させない」）
width: 66
subject: one small soft rounded heap of fresh cottage cheese made of many small, separate, moist white curd granules (#FFFDF6 with cream shading #EFE6D2) clumped together like a little mound of popcorn-sized lumps. Each curd lump is a small rounded bump outlined lightly. No rind, no holes, no bowl, no container.
face: the front of the heap has a slightly smoother, calmer area of small lumps
```

<!-- zukan: r04 -->
```text
name: リコッタ
key: 皮のない、ふわふわでざらっとした真っ白な低いドーム（伏せたお椀形）
src: 一般（data.py 解説「乳清を再加熱して作るふわふわ」・DETAIL）。かご目は描かない（ブロッチュと分けるため）
width: 68
subject: one fresh ricotta shaped like a low rounded dome (an upside-down bowl), soft and fluffy, pure milky white (#FFFEFA) with very light cream shading (#F0E9D8). The whole surface has a fine, soft, slightly grainy, airy texture shown with many tiny dots and short soft strokes, like fluffy wet snow. No rind, no holes, no basket pattern, no container.
face: the front of the dome is a broad calm area with only very faint grain
```

<!-- zukan: r26 -->
```text
name: シェーブル・フレ
key: 皮のない、真っ白でしっとりマットな小さな円柱（クリームチーズより白く、角が立つ）
src: 一般（data.py 解説「熟成前の若い山羊乳チーズ」）
width: 64
subject: one small fresh young goat's-milk cheese shaped like a short round drum (height about two thirds of its diameter) with soft but clear edges. Bright pure snow white (#FFFFFF) with soft warm ivory shading (#EFE8D8) (2026-10-17: was cool grey, looked like a marshmallow or cup), matte and moist, very slightly crumbly at the top edge. No rind, no mold, no ash, no leaves, no holes.
face: the front of the round side is a smooth calm area
```

<!-- zukan: r03 -->
```text
name: マスカルポーネ
key: 皮も形の角もない、クリームをすくって置いたようなつやのある小山（上がくるんととがる）
src: 一般（data.py 解説「クリーム状のフレッシュ」）
width: 66
subject: one soft dollop of mascarpone, like a big spoonful of very thick cream set down by itself: a wide soft mound with gentle folds and a small curled soft peak on top. Ivory cream color (#FFF6DF) with warm shading (#F0DFB8), smooth, glossy and silky. No rind, no holes, no spoon, no container.
face: the lower front of the mound is a broad smooth calm area
```

<!-- zukan: r56 -->
```text
name: フィオル・ディ・ラッテ
key: つやのある乳白色の小さめの玉。上に結び目なし・少しクリームがかった白（水牛より黄みがある）
src: 一般（data.py 解説「牛乳で作るモッツァレラの呼び名」・R15 は慣用名）。色は水牛（r55）と分けるための描き分け
width: 62
subject: one small round ball of fresh cow's-milk mozzarella, slightly squashed at the bottom, smooth stretched surface with a soft wet glossy shine and two small highlights. Warm milky white with a faint cream tint (#FBF5E6) and soft cream shading (#ECE0C4). One faint smooth fold line on the side where the stretched curd was closed. No knot on top, no rind, no holes, no liquid, no bowl.
face: the front of the ball is a smooth calm area
```

<!-- zukan: r05 -->
```text
name: ブロッチュ
key: 上が広く下がすぼまった台形の円すい（逆さのプリン形）の白いかたまりに、型の細いかご目
src: 一次（INAO 規程：乳清のチーズ・円すい台形〔tronconique〕・型〔faisselle〕で水切り）。かご目の質感は一般
width: 64
subject: one fresh Corsican whey cheese shaped like a truncated cone, wider at the top and narrower at the bottom (like an upside-down flowerpot with rounded edges), with a gently rounded top. Pure white (#FFFEFA) with soft cream shading (#EFE8D6). Its sides show a fine, faint woven basket-mold texture of thin crossing lines from the draining mold. Soft, fresh and moist. No rind, no holes, no basket, no container.
face: the front of the side, in its upper half, is a calm area where the woven texture fades out
```

<!-- zukan: r25 -->
```text
name: ルブロション
key: 平たい円盤。黄色〜黄みのオレンジの洗った薄い皮に白いうぶ毛（細かい白カビ）がうっすら、下に薄い木の板
src: 一次（INAO 規程：皮は洗って薄く、黄〜黄みのオレンジ・細く短い白いうぶ毛／トウヒ板は許可＝data.py 仕上げ「木」）
width: 70
subject: one flat round disc of washed-rind mountain cheese (height about one quarter of its diameter) with slightly rounded edges. Thin, even, smooth washed rind in yellow to orange-yellow (#F2B54A) with darker amber shading (#C98A2E), lightly dusted in patches with a fine short white bloom (shown as soft white speckles). It rests on a thin round plain light wooden board (spruce, pale #E8D2A6 with a few fine grain lines) of the same diameter, visible as a thin layer under the cheese. Whole, uncut. No label, no paper disc, no stamp.
face: the front of the rounded side of the cheese (above the board) is a calm area with few speckles
```

<!-- zukan: r55 -->
```text
name: モッツァレラ・ディ・ブーファラ・カンパーナ
key: 大きめの真っ白（磁器のような白）でつやつやの玉。上に小さな結び目（ちぎった跡）
src: 一次に準ずる（ONAF の品目シート：表面はなめらかでつや・ごく薄い皮・磁器の白）／data.py 解説「練って引き伸ばす」・DETAIL「ちぎって成形」
width: 70
subject: one large round ball of fresh buffalo-milk mozzarella with a small soft pinched knot on the very top where it was torn off. Bright porcelain white (#FFFFFF) with cool very light grey shading (#E4E6E6), with a very thin smooth skin, strongly glossy and wet-looking with two bright highlights. No rind, no holes, no liquid, no bowl, no leaves.
face: the front of the ball, below the knot, is a smooth calm area
```

<!-- zukan: r07 -->
```text
name: カマンベール・ド・ノルマンディ
key: 手のひら大の厚みのある白カビの円盤（マスターの白カビそのもの）。ふわふわの真っ白な皮
src: 一般（data.py 解説「白カビの代表」）。組3マスター soft を基準にする
width: 64
subject: one small round thick disc of Camembert-type soft-ripened cheese, palm-sized, its height about one third of its diameter, with slightly bulging rounded sides. Velvety, fluffy, snow-white bloomy rind (#FAF8F1) with very subtle cream shadows (#EDE4CF), shown with a few short soft strokes; a few tiny faint light-orange speckles may appear on the side. Whole, uncut. No swirl marks, no wooden box, no paper, no label.
face: the front of the rounded side is a smooth calm area
```

<!-- zukan: r08 -->
```text
name: ブリー・ド・モー
key: とても大きく薄い白カビの円盤（高さは直径の1/10ほど）。白い皮に赤みの筋・斑点が少し、下にわらのマット
src: 一次（INAO 規程：平たい円柱・型の内径36〜37cm・白い細い皮に赤い筋や斑点）／data.py 仕上げ「わら」
width: 78
subject: one very large, very flat round disc of Brie-type soft-ripened cheese, very wide and thin (height about one tenth of its diameter), seen from slightly above so the wide top surface is visible. Fine snow-white bloomy rind (#FAF8F1) with cream shadows (#EDE4CF) and a few thin rust-orange streaks and small spots (#D9894A) here and there. It rests on a thin round mat of woven pale golden straw (#E9CF85) that peeks out a little around the bottom edge. Whole, uncut. No label, no box, no knife.
face: the front of the thin side is too narrow, so the near front part of the wide top surface is a broad calm area with no streaks
```

<!-- zukan: r10 -->
```text
name: シャウルス
key: 背の高い白カビの円柱（高さが直径の半分以上）。ふわふわの真っ白な皮
src: 一次（INAO 規程：平らな面の円柱・型の径 85〜115mm）。高さの比は一般の外観（規程の数値は未確認）
width: 60
subject: one tall round cylinder of soft-ripened white-mold cheese with flat top and bottom faces (height about two thirds of its diameter), slightly rounded edges. Velvety, fluffy, snow-white bloomy rind (#FAF8F1) with very subtle cream shadows (#EDE4CF), shown with short soft strokes. Whole, uncut. No paper wrap, no label, no box.
face: the front of the tall round side is a smooth calm area
```

<!-- zukan: r11 -->
```text
name: ヌーシャテル
key: ハート形の白カビ（ふわふわの真っ白な皮・厚みのあるハート）
src: 一次（INAO 規程：白いふわふわの皮・形の一つにハート〔cœur〕）／data.py 仕上げ「ハート型」
width: 68
subject: one heart-shaped soft-ripened cheese, a thick plump heart (height about one quarter of its width) lying flat, seen from slightly above so the heart shape of the top is clearly readable. Velvety, fluffy, snow-white bloomy rind (#FAF8F1) with very subtle cream shadows (#EDE4CF), shown with short soft strokes. Whole, uncut. No label, no paper, no ribbon.
face: the front of the thick rounded side, near the point of the heart, is a calm area
```

<!-- zukan: r13 -->
```text
name: ゴルゴンゾーラ・ドルチェ
key: 背の高い円柱の青カビ。灰色がかった皮、切り口はやわらかいクリーム色で青緑のすじが少しだけ（ピカンテより青が少ない）
src: 一次（伊 規程：平らな面の円柱・側面の高さ13cm以上・皮は灰色かつ／またはピンクがかった色・中は白〜麦わら色で青緑／灰青のすじ）。ドルチェはすじが目立たない（ONAF）
width: 66
subject: one tall round wheel of soft blue cheese (height about two thirds of its diameter) with a natural rough rind in muted warm grey-beige (#B8AA98) with darker grey shading (#8E8274). One wedge is cut out at the front right, showing a very soft, creamy, milk-white to pale straw interior (#FBF3DC) that bulges slightly at the cut, with only a few soft, thin, sparse blue-green streaks (#5E9A8E). No foil, no paper, no label, no stamp.
face: the rind on the front left of the cut is a broad, smooth, calm area
```

<!-- zukan: r36 -->
```text
name: ゴーダ
key: 横がふくらんだ大きな車輪形。黄色いワックスでつるっと覆われ、切り口は淡い黄色に小さな穴が少し
src: 一般（data.py 解説「オランダの代表」・仕上げ「ワックス」＝任意の被覆の△）
width: 72
subject: one large wheel of Gouda-type cheese: a wide flat drum with softly bulging, rounded convex sides (height about one third of its diameter). Fully coated in smooth, glossy bright yellow wax (#F6C536) with deeper golden shading (#D49A1C). One small wedge is cut out at the front right, showing a pale yellow interior (#F7E3A0) with a thin wax edge and a few small round holes. No stamp, no label, no lettering, no markings on the wax.
face: the wax on the front left of the cut is a broad, smooth, calm area
```

<!-- zukan: r06 -->
```text
name: フェタ
key: 皮のない真っ白な四角いかたまり。角がぽろっと崩れ、塩水でぬれたつや
src: 一般（data.py 解説「羊乳主体で塩水に漬け」）
width: 68
subject: one rectangular block of fresh brined white cheese (a thick slab, about twice as wide as it is tall), pure white (#FFFFFF) with cool light grey shading (#E3E3DE). Moist brine-wet sheen with a few small clear droplets on the top, a few tiny irregular holes and small cracks, and one top corner slightly crumbled but still attached (2026-10-17: crumbs removed; no separate pieces). No rind, no container, no liquid pool, no olives, no leaves.
face: the front long side of the block is a broad calm area with no holes
```

<!-- zukan: r16 -->
```text
name: フルム・ダンベール
key: 細長く背の高い円柱（高さが直径の約1.5倍）。乾いた灰色の皮、上を切った面に青いすじ
src: 一次（INAO 規程：円柱・高さ17〜21cm・直径12.5〜14cm・薄く乾いた灰色の皮に白・黄・赤のカビ）
width: 52
subject: one tall upright cylinder of blue cheese, about one and a half times as tall as its diameter. Thin dry natural rind in light grey to grey (#B9B7B0) with darker grey shading (#8F8C85), with a few small soft spots of white and pale yellow mold. The top has been cut flat, showing the creamy ivory interior (#F7EFD8) with blue-green veins and small blue pockets (#4F8C8A) evenly spread. No label, no paper, no stamp.
face: the front of the tall round side, in its upper middle, is a smooth calm area
```

<!-- zukan: r09 -->
```text
name: ブリー・ド・ムラン
key: モーより小さく厚みのある白カビの円盤。白い皮に茶色〜赤茶の筋・斑点が多めで色が濃い、下にわらのマット
src: 一次（INAO 規程：平たい円柱・型の内径27〜28cm・白い皮に赤または茶色の筋や斑点）／data.py 解説「モーより小さく色濃い」・仕上げ「わら」
width: 66
subject: one flat round disc of Brie-type soft-ripened cheese, smaller and thicker than a big Brie (height about one sixth of its diameter), seen from slightly above. Bloomy rind in off-white (#F3EEE2) with cream shadows (#E2D6BC), more densely marked with many brown and reddish-brown streaks and spots (#A9683A), so it looks clearly darker and more rustic than a plain white bloomy rind. It rests on a thin round mat of woven pale golden straw (#E9CF85) that peeks out a little around the bottom edge. Whole, uncut. No label, no box, no knife.
face: the near front part of the top surface is a broad calm area with fewer streaks
```

<!-- zukan: r18 -->
```text
name: エポワス
key: 小さめの円盤。つやのあるオレンジ〜レンガ色の洗った皮（なめらか〜少ししわ）、少しやわらかくたわむ
src: 一次（EU 登録の単一文書：皮はなめらか〜少ししわ・つや・オレンジがかった象牙色〜レンガ色・色は表面の菌だけ）／data.py 解説「酒で皮を洗う」
width: 64
subject: one small round thick disc of washed-rind cheese (height about one third of its diameter) whose top is very slightly sunken and whose sides bulge a little because it is very soft. Smooth to slightly wrinkled, moist, shiny washed rind in orange to brick red-orange (#E07A3A) with deeper brick shading (#B4552A) and a few lighter orange-ivory areas (#F2B070). Whole, uncut. No wooden box, no label, no bottle, no glass.
face: the front of the bulging side is a smooth calm area without wrinkles
```

<!-- zukan: r12 -->
```text
name: ロックフォール
key: 低めの円柱。皮のないしっとりした象牙色の表面、切り口の白いチーズ全体に青緑のすじが均一に多い（ゴルゴンゾーラより白く青が多い）
src: 一次（INAO 規程：円柱・直径19〜20cm・高さ8.5〜11.5cm・羊乳・しっとりした皮・均一に青いすじ）
width: 70
subject: one round cylinder of sheep's-milk blue cheese (height about half of its diameter). The outer surface is a moist, thin, ivory-white skin (#F6F1E2) with soft cream shading (#E3D9C2), with some blue-green veins faintly showing through. One wedge is cut out at the front right, showing a white to ivory interior (#FBF7EC) richly and evenly marbled all through with many blue-green veins and small blue-green pockets (#3F7F78). No foil, no paper, no label, no stamp.
face: the outer surface on the front left of the cut is a broad, smooth, calm area with no veins
```


---

# 第2便（2026-10-17 チーズくん・出会う順＝付録A の登録日の早い順に次の25種）
- 根拠の確認日：2026-10-17。一次＝原産地呼称の規程（INAO・伊 MIPAAF・英 DEFRA・西 DOP の文書。検索結果の要約で読んだもので、PDF 本文を全部は自分の目で読んでいない）。一般＝規程で確かめていない一般的な外観（特徴を盛らない）
- 幅は第1便の結果（横長の形は指定より広く描かれる）を受けて 56〜68 に下げた。書き出し時に normalize_pad.py で 740〜800‰ にそろえる
- ピンク・マゼンタは背景抜きと衝突するので、規程が「ピンクがかる」とする皮（タレッジョ）は赤みのある淡いオレンジ茶で描く

<!-- zukan: r15 -->
```text
name: スティルトン
key: 背の高い円柱の青カビ。ざらざらで茶色っぽい自然の皮（コート）、切り口はクリーム色に中心から放射状の青すじ
src: 一次（英 Stilton PDO 仕様：伝統的な円柱形・自然にできる皮（coat/crust）・圧搾しない）。青すじが中心から放射状は一般
width: 62
subject: one tall round cylinder of English-style blue cheese (height slightly more than its diameter) with a natural, rough, crusty, wrinkled rind in warm light brown-beige (#C9A97E) with darker brown shading (#9C7B52). One wedge is cut out at the front right, showing a pale cream interior (#F7EDD3) with blue-green veins (#4F8A80) radiating outward from the centre like a cracked plate. No cloth, no label, no stamp.
face: the rough rind on the front left of the cut is a broad, calm area
```

<!-- zukan: r47 -->
```text
name: グラナ・パダーノ
key: 大きな太鼓形のホイール（側面が少しふくらむ）。硬い黄金色の皮、切り口は粒々の麦わら色
src: 一般（data.py 解説「加熱圧搾ハード」）。皮の刻印・文字は描かない
width: 66
subject: one big drum-shaped wheel of hard aged cheese (height about half of its diameter) with slightly convex bulging sides and flat top. Hard smooth natural rind in golden straw yellow (#E3B65C) with amber shading (#B7883A). One wedge is cut out at the front right, showing a pale straw-yellow interior (#F5E2A8) with a fine grainy, flaky texture shown by small dots and tiny white crystal specks. No markings, no dot pattern on the rind, no text, no label, no stamp.
face: the bulging side on the front left of the cut is a broad, smooth, calm area
```

<!-- zukan: r19 -->
```text
name: マンステール
key: 平たい円柱。薄くしっとりした洗った皮でオレンジ〜オレンジがかった赤、少しべたっとしたつや
src: 一次（INAO 規程：平たい〜厚めの円柱・薄くやや湿った皮・象牙色がかったオレンジ〜オレンジ赤）
width: 66
subject: one flat round cylinder of washed-rind cheese (height about one third of its diameter). Thin, smooth, slightly moist and tacky washed rind in orange to orange-red (#E9852F) with darker red-orange shading (#B95A22), with a soft sheen and a few very fine wrinkles. Whole, uncut. No box, no paper, no label, no stamp.
face: the front of the round side is a calm smooth area
```

<!-- zukan: r17 -->
```text
name: ブルー・ドーヴェルニュ
key: 平たい円柱の青カビ（スティルトンより低い）。薄い自然の皮に白いうぶ毛、切り口は白に青い斑点がまんべんなく
src: 一次（INAO 規程：平たい円柱・直径19〜23cm・高さ8〜11cm・自然の花咲いた皮）
width: 66
subject: one flat round cylinder of French blue cheese (height about half of its diameter). Thin natural rind in pale ivory (#EFE7D3) lightly dusted with soft white bloom and a few faint blue-grey spots. One wedge is cut out at the front right, showing a white interior (#FBF8EE) with many evenly scattered small blue-green pockets and short veins (#3E7C88). No foil, no label, no stamp.
face: the rind on the front left of the cut is a broad, smooth, calm area
```

<!-- zukan: r57 -->
```text
name: ブッラータ
key: 真っ白でつやのある小さな袋（巾着）。上に結び目、下に緑の葉を1枚敷く
src: 一般（data.py 解説「薄い袋の中に生クリーム」・仕上げ「葉」）
width: 64
subject: one burrata: a small, soft, glossy, pure milky white pouch (#FFFEFA with soft cool-cream shading #ECE6D6) shaped like a round drawstring bag, gathered and twisted into a small knot on top. It sits on one fresh, flat, long green leaf (#7FAF5A with darker green #5C8A3C) whose tips peek out on both sides. Whole, not cut open. No bowl, no liquid, no cream spilling.
face: the front of the round pouch below the knot is a broad smooth calm area
```

<!-- zukan: r20 -->
```text
name: ポン・レヴェック
key: 四角い平たいチーズ（角がきっちり）。薄いしっとりした皮で白っぽい〜赤みがかった黄土色、細かな白いうぶ毛
src: 一次（INAO 規程：正方形（大型は長方形も）・角とふちが立つ・皮は白っぽい〜赤みがかった・花咲いた皮をブラシまたは洗う）
width: 64
subject: one flat square cheese (side about three times its height) with sharp straight edges and corners. Thin, slightly moist rind in warm light ochre-yellow (#E8C27A) shading to a soft reddish amber (#C98B4A) at the edges, with faint fine white bloom and a faint crosshatch texture from the ripening mat. Whole, uncut. No box, no paper, no label, no stamp.
face: the front square side is a calm smooth area
```

<!-- zukan: r21 -->
```text
name: リヴァロ
key: 背の高めの円柱で、側面に植物の細い帯（ひも）が5本巻いてある。皮は赤みのあるオレンジ茶
src: 一次（INAO 規程：円柱・3〜5本の植物の帯（laîche）で巻く・洗った赤みのある皮）。5本は data.py 解説「5本の草の帯」とINAOの説明
width: 62
subject: one round cylinder of washed-rind cheese (height about two thirds of its diameter) with a moist, slightly wrinkled rind in reddish orange-brown (#D9823C) with darker shading (#A65A26). Five thin flat straw-colored bands of dried sedge leaf (#D8C27E) wrap horizontally around the side at even intervals, slightly pressing into the cheese. Whole, uncut. No box, no paper, no label, no stamp.
face: the front of the side between the 2nd and 4th band is a calm area (the face may overlap the middle band)
```

<!-- zukan: r58 -->
```text
name: スカモルツァ
key: 洋なし（ひょうたん）形の白っぽいチーズ。くびれた首にひもが結んである
src: 一般（data.py 解説「ひもで吊るして乾かすひょうたん形」・R16）
width: 60
subject: one pear-shaped (gourd-shaped) stretched-curd cheese: a round body with a narrow neck and a small round knob on top, smooth and slightly glossy, pale creamy ivory (#F8EFD8) with warm shading (#E3D2AE). A thin plain natural twine (#C7A46A) is tied around the neck with a small loop. Whole. No smoke color, no label, no tag.
face: the front of the round lower body is a broad smooth calm area
```

<!-- zukan: r22 -->
```text
name: マロワル
key: 正方形の厚めのチーズ。皮はむらのない赤みのあるオレンジ色でしっとり、上の面に棚のすのこの跡
src: 一次（INAO 規程：正方形・皮は洗って均一な赤オレンジ・面に熟成棚の跡）
width: 64
subject: one thick square cheese (side about twice its height) with slightly rounded edges. Smooth, moist, slightly shiny washed rind in an even reddish orange (#E07A2E) with darker shading (#B0531E). The top face shows a faint regular pattern of thin parallel lines from the ripening rack. Whole, uncut. No box, no paper, no label, no stamp.
face: the front side is a broad calm area
```

<!-- zukan: r14 -->
```text
name: ゴルゴンゾーラ・ピカンテ
key: 背の高い円柱の青カビ。灰色がかった皮、切り口はかためで麦わら色、青緑のすじがたっぷり（ドルチェより青が多い）
src: 一次（伊 規程：r13 と同じ形と皮・ピカンテは熟成が長い）。青の多さは一般（ONAF）
width: 64
subject: one tall round wheel of firm blue cheese (height about two thirds of its diameter) with a natural rough rind in muted grey-beige (#ADA08E) with darker grey shading (#857968). One wedge is cut out at the front right, showing a firmer, slightly crumbly pale straw interior (#F2E5C2) densely marbled with many bold blue-green veins and pockets (#3F7A70). No foil, no paper, no label, no stamp.
face: the rind on the front left of the cut is a broad, smooth, calm area
```

<!-- zukan: r24 -->
```text
name: タレッジョ
key: 平たい正方形（四角いタイル）。薄くやわらかい皮で赤みのある淡いオレンジ茶、細かな灰色のうぶ毛の斑
src: 一次（伊 規程：面が平らな四角い直方体・側面4〜7cm・皮は薄くやわらかく自然な淡い赤み）。赤みは背景抜きのため淡いオレンジ茶で描く
width: 66
subject: one flat square slab of washed-rind cheese (side about three times its height) with straight sides and slightly soft corners. Thin soft rind in a warm light peach-tan (#E8B98A) with light brown shading (#C49364), with small scattered soft grey-green mold speckles. One small corner piece is cut away at the front right, showing a creamy pale ivory interior (#F8EDCF). No stamps, no rings, no symbols, no label, no paper.
face: the front side and front-left of the top are calm areas
```

<!-- zukan: r59 -->
```text
name: スカモルツァ・アフミカータ
key: 洋なし（ひょうたん）形で、燻製の黄金色〜茶色のつやのある皮。首にひも
src: 一般（data.py 解説「スカモルツァを燻製に」・仕上げ「燻製」）
width: 60
subject: one pear-shaped (gourd-shaped) smoked stretched-curd cheese: a round body with a narrow neck and a small round knob on top, with a smooth glossy smoked skin in golden amber to light brown (#D69A4A) with deeper brown shading (#A0652A). A thin plain natural twine (#C7A46A) is tied around the neck with a small loop. Whole. No smoke clouds, no label, no tag.
face: the front of the round lower body is a broad smooth calm area
```

<!-- zukan: r63 -->
```text
name: モン・ドール
key: 丸い木の箱（トウヒ）に入った、波打つしわの皮のやわらかいチーズ。側面にトウヒの樹皮の帯
src: 一次（INAO 規程：平たい円柱・洗った皮はしわが寄り軽く花咲き・淡い黄〜ばら色がかった茶・トウヒの帯とトウヒの箱）
width: 66
subject: one soft washed-rind cheese sitting in a shallow round box of thin pale spruce wood (#E3C893 with fine grain lines, no lid). The cheese is wrapped around its side with a band of spruce bark (#B98C55) just inside the box rim. The top rind is soft and wavy with gentle wrinkles and folds, pale yellow to light warm brown (#E6C27C) with a faint white bloom. No lid, no label, no text, no spoon.
face: the front of the wooden box side is a broad calm area
```

<!-- zukan: r60 -->
```text
name: プロヴォローネ・ドルチェ
key: 太いソーセージ形（横に長い円柱）。淡い黄色のなめらかな皮に、ひもが2本巻いてある
src: 一般（data.py 解説「子牛のレンネットで作る甘口」）。形は大型プロヴォローネの代表的な「サラミ形」
width: 66
subject: one large stretched-curd cheese shaped like a thick salami, a long rounded cylinder lying on its side, about twice as long as it is thick, with rounded ends. Smooth thin natural skin in pale butter yellow (#F2D68A) with soft golden shading (#D3AF5C). Two plain natural cords (#C7A46A) are tied around it, one near each end. Whole. No label, no tag, no net.
face: the front middle of the long side is a broad smooth calm area
```

<!-- zukan: r27 -->
```text
name: ヴァランセ
key: 先を切り落としたピラミッド形。全体が灰色の灰（木炭）をまとい、青灰色のうぶ毛
src: 一次（INAO：先を切ったピラミッド形・灰をまぶした皮は明るい灰〜青みがかった灰）
width: 60
subject: one small goat's-milk cheese shaped like a square pyramid with its top cut off flat (truncated pyramid). The whole surface is coated in fine charcoal ash and a soft velvety bloom, light grey to bluish grey (#A9AEB2) with darker grey shading (#7D8389), slightly mottled. Whole, uncut. No leaves, no straw, no label.
face: the front sloping side is a broad calm area
```

<!-- zukan: r23 -->
```text
name: ラングル
key: 小さめの円柱で、上の面がくぼんだ「泉」になっている。しわの寄ったオレンジ色の皮
src: 一次（INAO：上の面のくぼみ（fontaine）・皮は黄金色〜赤茶）
width: 62
subject: one small round cylinder of washed-rind cheese (height about two thirds of its diameter) whose top surface is clearly sunken into a shallow round hollow, like a little basin. Thin, moist, finely wrinkled rind in golden orange (#E99A3A) with reddish-brown shading (#B66528). The hollow on top is empty. Whole, uncut. No liquid, no bottle, no paper band, no label.
face: the front of the round side is a calm smooth area
```

<!-- zukan: r62 -->
```text
name: カチョカヴァッロ・シラーノ
key: 卵形の胴に小さな頭（こぶ）がついた形。薄くなめらかな麦わら色の皮、首にひも
src: 一般（data.py 解説「南イタリアのパスタフィラータ」）。頭つきの卵形は一般的な外観（スカモルツァより胴が縦長）
width: 60
subject: one stretched-curd cheese with an elongated oval egg-shaped body (taller than wide) topped by a narrow neck and a distinct small round head. Thin smooth slightly glossy rind in straw yellow (#EBCB7E) with golden shading (#C79E4E). A plain natural cord (#C7A46A) is tied around the neck. Whole. No label, no tag, no smoke color.
face: the front of the upper middle of the egg-shaped body is a broad smooth calm area
```

<!-- zukan: r29 -->
```text
name: サント・モール・ド・トゥーレーヌ
key: 細長い丸太形（横向きの円柱）で、両端から1本のわらが出ている。灰をまとった灰色の皮
src: 一般（data.py 解説「中心にライ麦のわらを通した細長い形」・仕上げ「わら」）。灰をまぶすのは一般
width: 66
subject: one long log-shaped goat's-milk cheese lying on its side (about three times longer than thick, slightly tapered toward one end). A single thin straight rye straw (#E2C46E) runs through its centre and sticks out a little at both ends. The rind is covered with fine grey ash and a soft white-grey bloom (#B8BAB6 with darker grey #8E918E), slightly mottled. Whole, uncut. No leaves, no label.
face: the front middle of the log is a broad calm area
```

<!-- zukan: r41 -->
```text
name: サン・ネクテール
key: 平たい円盤（低い円柱）。灰色がかった自然の皮に白・黄・赤茶の小さなカビの斑
src: 一次（INAO 規程：平たい円柱・直径20〜24cm・高さ3.5〜5.5cm）。皮の色は一般
width: 68
subject: one flat round disc of semi-soft cheese (height about one quarter of its diameter) with straight sides. Natural velvety rind in soft grey-beige (#BDB3A0) with darker shading (#948A78), dotted with small scattered spots of white, pale yellow and reddish-brown mold. Whole, uncut. No casein plate, no label, no stamp, no text.
face: the front part of the top surface near the edge is the calm area (the side band is narrow)
```

<!-- zukan: r30 -->
```text
name: プリニー・サン・ピエール
key: 背の高いほっそりしたピラミッド（先は小さく平ら）。灰はなく、象牙色の皮にしわ（脳のような模様）
src: 一次（INAO 規程：細長いピラミッドの台形・底は正方形・灰なし・象牙色の皮にしわ、うっすら青み）
width: 58
subject: one tall slender square-based pyramid of goat's-milk cheese with a small flat top (truncated just at the tip), clearly taller than its base width. Thin natural rind in ivory white (#F3EDDD) with faint bluish-grey shading (#D3D3CC), covered with a fine wrinkled, brain-like texture. No ash, no straw, no leaves, no label.
face: the front sloping side, lower half, is a calm area
```

<!-- zukan: r31 -->
```text
name: クロタン・ド・シャヴィニョル
key: ころんと小さな円柱（ふちが丸い）。白〜うっすら青みの乾いた皮
src: 一般（data.py 解説「半乾き〜カチカチまで」）。小さな円柱は一般的な外観
width: 58
subject: one small round goat's-milk cheese shaped like a short cylinder with rounded edges, slightly bulging sides (height about three quarters of its diameter). Dry thin natural rind in cream white (#F2EBD8) with patches of soft bluish-grey bloom (#C7CBC6) and light shading (#DCD3BD). Whole, uncut. No ash, no leaves, no label.
face: the front of the rounded side is a calm area
```

<!-- zukan: r43 -->
```text
name: マンチェゴ
key: 円柱で、側面にジグザグの編み目（パレタ模様）、上の面に花模様の型あと。淡い黄色〜黄土色の硬い皮
src: 一次（DOP 単一文書：円柱・面は平ら・硬い皮は淡い黄〜こげ茶・側面にパレタ型、面に花型の跡）
width: 64
subject: one round cylinder of firm sheep's-milk cheese (height about half of its diameter) with flat faces. Hard natural rind in pale golden ochre (#DDB875) with brown shading (#A9824A). The side is fully imprinted with a regular woven zigzag (herringbone) basket pattern; the top face has a simple radial flower-like pattern pressed into it. Whole, uncut. No label, no casein plate, no text.
face: the front of the side is a calm area where the zigzag pattern is drawn lighter
```

<!-- zukan: r33 -->
```text
name: マコネ
key: 小さな円すい台形（上が細い）。白〜クリーム色のうっすらした皮
src: 一般（data.py 解説「円すい台形の小型」）
width: 56
subject: one small goat's-milk cheese shaped like a short truncated cone (narrower at the top, flat top), height about equal to its base diameter. Thin natural rind in cream white (#F5EEDC) with a faint ivory-yellow bloom and soft shading (#DCD0B4). Whole, uncut. No ash, no leaves, no label.
face: the front of the sloping side is a calm area
```

<!-- zukan: r61 -->
```text
name: プロヴォローネ・ピカンテ
key: 洋なし形の大きなチーズをひもで吊るした形。濃い黄金色のかための皮（ドルチェより色が濃い）
src: 一般（data.py 解説「子山羊・子羊のレンネットで辛口」）。洋なし形とひもは大型プロヴォローネの代表的な外観。ドルチェ（サラミ形・淡黄）と描き分ける
width: 62
subject: one large pear-shaped stretched-curd cheese (round wide bottom, narrowing toward the top) held by a few plain natural cords (#B89558) that run down from a top knot in a simple open crisscross. Firm smooth rind in deep golden amber (#D9A040) with darker shading (#A87124). Whole. No label, no tag.
face: the front of the wide lower body between the cords is a broad calm area
```

<!-- zukan: r34 -->
```text
name: ロカマドゥール
key: 手のひらにのるほどの小さく平たい円盤（コイン形）。クリーム色のしっとりした皮
src: 一般（data.py 解説「カベクー一族の一口」）
width: 60
subject: one tiny flat round disc of goat's-milk cheese (like a thick coin; height about one third of its diameter) with soft rounded edges. Thin moist natural rind in creamy ivory (#F6EBD0) with soft warm shading (#DECBA2) and a very faint white bloom. Whole, uncut. No leaves, no label.
face: the top surface near the front edge is the calm area (the side is too thin)
```

## 手直しの --fix 文（2026-10-17・各1回）
- r26 シェーブル・フレ：`Keep the same shape, but make the shading warm and very light: use soft warm ivory shading (#EFE8D8) instead of grey, so it reads as a fresh moist cheese, not a marshmallow, cup or ceramic. Add a faint, fine, slightly crumbly matte texture on the top surface and the top edge.`
- r06 フェタ：`Keep everything the same, but the crumbled corner must stay attached to the block: no separate floating crumbs or pieces anywhere. The broken corner is just slightly rough and uneven.`


---

# 第3便（2026-10-17 チーズくん・残り37種＝実在20・失敗種9・工房オリジナル8）
- 根拠の確認日：2026-10-17。実在20種の外観は一般知識（data.py の解説・仕上げと矛盾させない）。規程の本文は今回読んでいないので、src は「一般」と書いた。特徴を盛らない
- 失敗種は「可愛い」で止める（腐敗・病気・汚れに見せない。罰に見えない）。工房オリジナルは実在の銘柄に見せない（基本のタイプの形を、実在種と違う形でやさしく描く）
- ピンク・マゼンタ・紫は背景抜きと衝突するので、どの体にも使わない

<!-- zukan: r28 -->
```text
name: セル・シュル・シェール
key: 小さな低い円柱（上が少し細い）。灰黒い木炭の皮に、青みがかった白いカビがまだらに出ている
src: 一般（data.py 解説「木炭と塩をまぶし、熟成で青みのカビが出る」・仕上げ「木炭」）
width: 58
subject: one small low goat's-milk cheese shaped like a short truncated cone (height about one third of its diameter, top slightly narrower than the base). The whole surface is coated with fine dark charcoal-grey ash (#6F6D6A with deeper shading #4F4D4C), mottled with soft patches of pale blue-grey and white bloom (#B9C6C8). Dry and matte, slightly rough. Whole, uncut. No leaves, no straw, no label.
face: the front of the rounded side is a calm area with fewer bloom patches
```

<!-- zukan: r32 -->
```text
name: バノン
key: 平たい丸いチーズが、茶色い栗の葉に何枚も包まれ、細いひも（ラフィア）で十字に縛ってある
src: 一般（data.py 解説「栗の葉で包みラフィアで縛って熟成」・仕上げ「葉」）
width: 58
subject: one small flat round goat's-milk cheese completely wrapped in several overlapping dried chestnut leaves (olive-brown and tan #A98B52 with darker veins #7A6234, leaf edges slightly curled), tied crosswise with a thin natural raffia string (pale straw #D9C27A) knotted in a small bow-like knot on top. The wrapped bundle is a flat round shape (height about one third of its diameter). Whole. No label, no tag.
face: the front of the wrapped side between the leaves is a calm area
```

<!-- zukan: r35 -->
```text
name: シェヴロタン
key: 小さな低い円柱。薄く洗った橙〜象牙色の皮、下に薄い丸いトウヒの板を敷く
src: 一般（data.py 解説「農家製のみ。ルブロションと縁深い製法」・仕上げ「木」）。山羊乳・洗った皮・トウヒ板はデータどおり
width: 62
subject: one small flat round goat's-milk washed-rind cheese (height about one third of its diameter) with a thin, smooth, slightly sticky rind in pale orange-ivory (#EFC48A) with soft amber shading (#C99655), a few very faint fine wrinkles. It rests on a thin round plain light wooden board (spruce, pale #E8D2A6 with a few fine grain lines) of the same diameter, visible as a thin layer under the cheese. Whole, uncut. No label, no paper, no stamp.
face: the front of the rounded side (above the board) is a calm area
```

<!-- zukan: r37 -->
```text
name: エダム
key: 真っ赤なワックスで覆われた球に近い丸い形（少しつぶれた球）。切り口は淡い黄色
src: 一般（data.py 解説「丸い形が代表」・仕上げ「ワックス」）。赤はよく見る輸出品の被覆
width: 58
subject: one nearly spherical, slightly flattened ball of Edam-type cheese (height about 85% of its width) fully coated in smooth glossy bright red wax (#D63A2A with deeper red shading #A8281C, no pink). One small wedge is cut out at the front right showing a thin red wax edge and a pale yellow interior (#F7E6A4) with a smooth texture. No stamp, no label, no lettering, no markings on the wax.
face: the red wax on the front left of the cut is a broad, smooth, calm area
```

<!-- zukan: r38 -->
```text
name: チェダー
key: 淡いクリーム色の布を巻いた円柱。切り口は黄金色で、ぽろっと崩れる
src: 一般（data.py 解説「カードを積むチェダリング」・仕上げ「布」）。切り口の色は一般的な外観
width: 60
subject: one round cylinder of Cheddar-type cheese (height about 90% of its diameter) wrapped around its side and top in off-white cheesecloth (#EADCBC with darker tan shading #C9B58C, a fine woven texture drawn as thin crosshatch lines, a slightly rough cloth edge). One wedge is cut out at the front right, showing a golden yellow interior (#F2C867) with a dense, slightly crumbly texture shown with a few tiny cracks. No label, no stamp, no string.
face: the cloth on the front left of the cut is a broad, smooth, calm area
```

<!-- zukan: r39 -->
```text
name: ミモレット
key: 灰茶色でくぼみ（小さな穴）がたくさんある球。切り口は鮮やかなオレンジ色
src: 一般（data.py 解説「小さなダニ（シロン）が外皮を熟成させる」・仕上げ「シロン」）。ダニそのものは描かない
width: 58
subject: one nearly spherical ball of orange hard cheese (height about 90% of its width). The rind is matte grey-brown (#B4A07F with darker shading #8E7B5E) covered with many small shallow round pits and crater-like dents, like a golf ball with irregular little pockmarks. One small wedge is cut out at the front right, showing a bright orange interior (#F08A24) with a fine smooth texture. No mites or bugs drawn, no label, no stamp.
face: the grey-brown rind on the front left of the cut has few dents (a broad calm area)
```

<!-- zukan: r40 -->
```text
name: ラクレット・デュ・ヴァレー
key: 平たい大きな車輪形。つやのない茶〜黄褐色の皮、下にトウヒの薄い板。切り口は象牙色
src: 一般（data.py 解説「トウヒ板の上で3か月以上熟成」・仕上げ「木」）
width: 66
subject: one wide flat wheel of Swiss alpine cheese (height about one fifth of its diameter) with slightly rounded edges and a smooth matte natural rind in honey brown to yellow-brown (#CDA05E with darker shading #A57A3C). One small wedge is cut out at the front right showing an ivory-yellow interior (#F6E7B2) with a few tiny holes. It rests on a thin round plain light wooden board (spruce, pale #E8D2A6 with a few fine grain lines) of the same diameter, visible as a thin layer under the cheese. No stamp, no label, no text.
face: the rind of the side on the front left of the cut (above the board) is a calm area
```

<!-- zukan: r42 -->
```text
name: モルビエ
key: 平たい円盤。切り口の真ん中に黒い1本線（植物の炭）が水平に入っている
src: 一般（data.py 解説「真ん中の黒い1本線は植物の炭」・仕上げ「木炭」）
width: 64
subject: one flat round wheel of semi-hard cheese (height about one third of its diameter) with a smooth natural rind in warm beige-tan (#E3C58C with shading #BD9A5F). One wedge is cut out at the front right, showing an ivory-yellow interior (#F7E9B8) divided into two equal layers by one thin clean horizontal black stripe (#3B3836) of vegetable ash running across the middle of the cut face, like a cream-filled biscuit. No label, no stamp.
face: the rind on the front left of the cut is a broad, smooth, calm area
```

<!-- zukan: r44 -->
```text
name: オッソー・イラティ
key: 厚めの円盤（太鼓形）。橙がかった黄色〜灰茶のまだらな自然の皮。切り口はクリーム色に小さな不規則な穴
src: 一般（data.py 解説「ピレネーの羊乳」・仕上げなし）。ジャムは描かない
width: 64
subject: one thick round wheel of sheep's-milk cheese (height about half of its diameter) with slightly rounded sides and a dry natural rind that is mottled from orange-yellow (#E2A94E) to grey-brown (#A89478), with a faint slightly rough texture. One wedge is cut out at the front right, showing a cream-ivory interior (#F6EACB) with a few small irregular tiny holes. No jam, no fruit, no label, no stamp.
face: the rind on the front left of the cut is a broad, smooth, calm area
```

<!-- zukan: r45 -->
```text
name: テット・ド・モワンヌ
key: 小さな背のある円柱。上の面が花びらのようにフリルに削られ、下に丸い木の台
src: 一般（data.py 解説「名は『修道士の頭』。削って花びら状に」・仕上げ「木」）
width: 54
subject: one small tall round cylinder of Swiss cheese (height about 90% of its diameter) with a smooth washed rind in warm orange-brown (#D9A15A with shading #A8743A). The top is shaved into a ruffled, frilly flower-like rosette of thin, curly, translucent pale yellow petals (#F6E5A6) rising a little above the top. It stands on a small round plain wooden board (light wood #E0C28E with a few grain lines) slightly wider than the cheese. No knife, no stand mechanism, no label, no text.
face: the front of the cylinder's side is a broad calm area
```

<!-- zukan: r46 -->
```text
name: パルミジャーノ・レッジャーノ
key: 大きな太鼓形。側面はまっすぐ〜少しくびれ、深い琥珀の皮。手前で荒く割れた切り口は粒々で結晶が光る
src: 一般（data.py 解説「無殺菌乳で作り12か月以上熟成」）。皮の刻印は描かない
width: 62
subject: one big tall drum-shaped wheel of very hard aged cheese (height about 60% of its diameter) with nearly straight, very slightly waisted sides and flat top, hard smooth natural rind in deep amber-gold (#D69A3C with darker shading #A56B22). A rough, craggy chunk is broken off at the front right (broken, not cleanly cut), showing a pale golden interior (#F2D585) with a coarse grainy flaky texture and many small white crystal specks. No markings or dot pattern on the rind, no text, no label, no stamp, no knife.
face: the smooth rind of the side on the front left of the break is a broad calm area
```

<!-- zukan: r48 -->
```text
name: エメンタール
key: 大きな車輪形。切り口は淡い黄色で、くるくると大きな丸い穴が並ぶ
src: 一般（data.py 解説「プロピオン酸菌のガスで大きな穴が開く」）
width: 64
subject: one big wheel of Swiss Emmental-type cheese: a wide drum with softly rounded bulging sides (height about 45% of its diameter), smooth golden-brown natural rind (#D4A255 with darker shading #A9772F). One wedge is cut out at the front right, showing a pale yellow interior (#F8E8A8) with several big round clean holes of different sizes (eyes), the biggest about one tenth of the wheel width, with soft shading inside each hole. No text, no label, no stamp.
face: the rind of the side on the front left of the cut is a broad, smooth, calm area
```

<!-- zukan: r49 -->
```text
name: グリュイエール
key: 厚めの車輪形。茶色くざらっとした皮、切り口は淡黄で小さな穴がわずか。下にトウヒの板
src: 一般（data.py 解説「トウヒ板の上、塩水で磨いて5か月以上」・仕上げ「木」）
width: 64
subject: one thick wheel of Swiss hard cheese (height about 40% of its diameter) with a slightly rough, dry, matte natural rind in rich brown (#B97F45 with darker shading #8A5A2E), with a faint grainy texture. One wedge is cut out at the front right showing a pale yellow interior (#F5E4A0) with a few tiny holes. It rests on a thin round plain light wooden board (spruce, pale #E8D2A6 with a few fine grain lines) of the same diameter, visible as a thin layer under the cheese. No stamp, no label, no text.
face: the rind of the side on the front left of the cut (above the board) is a calm area
```

<!-- zukan: r50 -->
```text
name: コンテ
key: 大きな平たい車輪形。丸みのある側面、黄金〜赤みの茶色の皮。切り口は象牙色〜淡黄で小さな穴がわずか
src: 一般（data.py 解説「1個に乳約450L。4か月以上熟成」）
width: 68
subject: one very big wide wheel of French alpine cheese (height about 35% of its diameter) with strongly rounded sides and a smooth dry natural rind in golden tan with a slightly reddish tinge (#D7A560 with darker shading #AB7A3A). One wedge is cut out at the front right, showing an ivory to pale yellow interior (#F4E4AA) with a few tiny scattered holes. No wooden board, no label, no stamp, no text.
face: the rind of the side on the front left of the cut is a broad, smooth, calm area
```

<!-- zukan: r51 -->
```text
name: ボーフォール
key: 側面がくぼんだ（腰がくびれた）車輪形で、くぼみに薄い木の輪が巻いてある。皮は褐色
src: 一般（data.py 解説「ブナの輪で締め側面がくぼんだ形に」・仕上げ「木」）
width: 60
subject: one wheel of Beaufort-type alpine cheese with a clearly concave, waisted side: the top and bottom edges bulge out a little and the middle of the side is dented inward (height about 45% of its diameter). Smooth dry natural rind in warm golden brown (#C99552 with darker shading #9A6A32). A thin band of pale beech wood (#E8D3A6 with fine grain lines) fits snugly in the concave waist all around, flush with the bulging edges. One wedge is cut out at the front right showing a smooth ivory-yellow interior (#F6E6AB) with no holes. No stamp, no label, no text.
face: the wooden band and rind on the front left of the cut form a broad calm area (the face may overlap the band)
```

<!-- zukan: r52 -->
```text
name: ペコリーノ・ロマーノ
key: 背のある円柱形。白〜麦わら色のつるっとした皮、切り口は白く小さな穴がわずか
src: 一般（data.py 解説「羊乳。卓上用5か月、おろし用8か月以上」）。ひもの跡・刻印は描かない
width: 60
subject: one tall round drum of hard sheep's-milk cheese (height about 75% of its diameter) with straight, very slightly bulging sides and flat top, a smooth dry rind in pale straw white (#F0E3B8 with shading #D2BF8A). One wedge is cut out at the front right, showing a white to ivory interior (#FBF7EA) with a few tiny holes and a fine dry texture. No rope marks, no net pattern, no markings, no text, no label, no stamp.
face: the rind of the side on the front left of the cut is a broad, smooth, calm area
```

<!-- zukan: r53 -->
```text
name: 熟成ゴーダ
key: 深い琥珀色のワックスをまとった大きな車輪形。切り口は濃いキャラメル色で白い結晶の粒
src: 一般（data.py 解説「ゴーダを長く熟成。硬く濃い味に」・仕上げ「ワックス」）。ワックスの色は任意
width: 66
subject: one large wheel of aged Gouda-type cheese: a wide drum with softly bulging, rounded sides (height about 40% of its diameter), fully coated in smooth glossy deep amber-brown wax (#B8741F with darker shading #8A5216). One small wedge is cut out at the front right showing a thin wax edge and a deep caramel-orange interior (#E8A245) with small white crystal specks scattered through it. No stamp, no label, no lettering, no markings on the wax.
face: the wax on the front left of the cut is a broad, smooth, calm area
```

<!-- zukan: r54 -->
```text
name: ミモレット・エクストラヴィエイユ
key: 濃い灰茶のくぼみだらけの球。切り口は濃い赤みのオレンジ（ミモレットより濃い）
src: 一般（data.py 解説「18か月を超えて熟成させたミモレット」・仕上げ「シロン」）。ダニそのものは描かない
width: 58
subject: one nearly spherical ball of aged orange hard cheese (height about 90% of its width). The rind is matte dark grey-brown (#8F7B60 with deeper shading #6C5A43) covered with many small shallow round pits and crater-like dents, more densely pitted than a young one. One small wedge is cut out at the front right, showing a deep burnt-orange interior (#DB6A20) with a few tiny pale crystal specks. No mites or bugs drawn, no label, no stamp.
face: the dark rind on the front left of the cut has few dents (a broad calm area)
```

<!-- zukan: r64 -->
```text
name: サレール
key: 背の高い太い円柱。ざらついた橙〜灰茶のあつい皮。丸い木の台の上
src: 一般（data.py 解説「放牧期だけ木桶『ジェルル』で作る農家製」・仕上げ「木」）。木桶そのものは描かず、丸い木の台で表す
width: 56
subject: one tall thick round cylinder of farmhouse mountain cheese (height about 90% of its diameter) with a thick, rough, dusty natural rind in orange-brown to grey (#C28A4F with darker shading #8C6238 and a few grey-ochre patches #B5A27F), slightly bumpy. One small wedge is cut out at the front right showing a pale golden-yellow interior (#F2DC8E). It stands on a small round plain wooden board (light wood #E0C28E with a few grain lines) slightly wider than the cheese. No label, no stamp, no text.
face: the rind on the front left of the cut is a calm area
```

<!-- zukan: r65 -->
```text
name: ボーフォール・シャレ・ダルパージュ
key: ボーフォールと同じくびれた車輪形で、より深い金褐色の皮。てっぺんに高山の小さな花が一輪
src: 一般（data.py 解説「夏の高地の山小屋で1つの群れの乳から」・仕上げ「木」）。花はこの種を見分けるための飾りで、規程にはない
width: 60
subject: one wheel of Beaufort-type alpine cheese with a clearly concave, waisted side: the top and bottom edges bulge out a little and the middle of the side is dented inward (height about 45% of its diameter). Smooth natural rind in deep golden brown (#BB8240 with darker shading #8A5A28). A thin band of pale beech wood (#E8D3A6 with fine grain lines) fits snugly in the concave waist all around. One small wedge is cut out at the front right showing a smooth ivory-yellow interior (#F6E6AB) with no holes. One tiny sprig of yellow alpine flowers with two small green leaves (#F2C93A flowers, #6E9B4A leaves) lies on top. No stamp, no label, no text.
face: the wooden band and rind on the front left of the cut form a broad calm area (the face may overlap the band)
```

<!-- zukan: f66 -->
```text
name: あおくなれず
key: 青カビの円柱だが青がほとんど出ていない。象牙色〜灰白の皮に、切り口に青みのかすかな点が少しだけ
src: 失敗種（data.py FAIL「青カビなのに針以外の手入れ」）。ゲーム上の見た目で実在しない
width: 60
subject: one small round cylinder of cheese (height about 70% of its diameter), with a smooth, slightly dull ivory-grey rind (#EDE8DA with shading #CFC8B2). One wedge is cut out at the front right, showing a plain cream interior (#F8F1DC) that has only a few tiny faint pale blue-grey dots (#B7C9CC), almost no blue at all, and a couple of small empty round air holes. Plain and a bit sad-looking but clean and cute. No mold fuzz, no dirt, no label, no stamp.
face: the rind on the front left of the cut is a broad, smooth, calm area
```

<!-- zukan: f67 -->
```text
name: ほったらかし
key: 洗われなかったウォッシュ。ぼさぼさと白いうぶ毛が逆立つ、くすんだ薄い茶色の平たい円柱
src: 失敗種（data.py FAIL「ウォッシュ菌なのに洗う・塩以外」）。ゲーム上の見た目で実在しない
width: 62
subject: one flat round cylinder of cheese (height about one third of its diameter), dull pale tan-beige (#DCC9A3 with shading #B9A57C), covered all over with short, fluffy, scruffy tufts of soft white fuzz (#FBF8EE) sticking up in all directions like messy hair, a bit untidy but soft, fluffy and cute like a plush toy. Whole, uncut. No green or black mold, no dirt, no label.
face: the front of the side has fewer tufts, a broad calm area
```

<!-- zukan: f68 -->
```text
name: ひびわれ
key: 乾いてひびが入った淡い黄土色の円柱。表面に細い線状のひび割れが何本も走る
src: 失敗種（data.py FAIL「カビ系を『からっと』で熟成」）。ゲーム上の見た目で実在しない
width: 60
subject: one small round cylinder of cheese (height about 75% of its diameter), dry and matte, with a pale dusty ochre-beige rind (#E4CD9B with shading #BFA46F), the surface covered in several thin neat hairline cracks branching across the top and side like a dried clay pot, with a few tiny crumbs of cheese along the edges. Dry but cute, not dirty. Whole, uncut. No mold, no stains, no label.
face: the front of the rounded side is a calm area with few cracks
```

<!-- zukan: f69 -->
```text
name: とろけすぎ
key: とろんと溶けてくずれた白カビ。上がへこんで中のクリームが縁から少しあふれ、つやつや
src: 失敗種（data.py FAIL「白カビを7日以上置く」）。ゲーム上の見た目で実在しない
width: 62
subject: one soft round cheese that has slumped: a flat bulging puddle-like dome of white bloomy cheese (#FBF8EE with cream shading #E8DCBE), the top sinking in gently, and thick glossy creamy pale yellow filling (#F6E7AE) oozing a little over the lower edge at the front in a smooth rounded blob. Soft, melting, sleepy-looking but clean and cute. Whole. No spoon, no plate, no puddle on the floor, no label.
face: the front of the slumped white dome is a broad calm area
```

<!-- zukan: f70 -->
```text
name: ふくれっつら
key: ぱんぱんに膨らんだ丸い車輪形。つるっと丸く盛り上がった側面、つやのある黄金色。小さなひび
src: 失敗種（data.py FAIL「穴あき菌で圧搾3未満」）。ゲーム上の見た目で実在しない
width: 60
subject: one chubby, puffed-up wheel of cheese with very round bulging balloon-like sides, glossy golden yellow (#F2C14E with deeper shading #D49A2A), looking tight and inflated, with one or two tiny neat cracks near the middle of the side. Whole, uncut. Round, cute and plump. No holes shown, no label.
face: the front of the swollen side is a broad smooth calm area
```

<!-- zukan: f71 -->
```text
name: のびきらず
key: 伸びきれなかったパスタフィラータ。ぼこぼこの短い塊で、中ほどに折れしわ。ミルク白
src: 失敗種（data.py FAIL「練るなのに圧搾2以上」）。ゲーム上の見た目で実在しない
width: 58
subject: one lumpy, short, knobby clump of stretched-curd cheese that did not stretch properly: a firm rounded blob with several rough bumps, folds and creases (#FAF3DF with warm shading #E3D4AE), slightly matte, glossy only on its highest bumps. Stubby and a bit stubborn-looking but cute. Whole. No bowl, no water, no string, no label.
face: the front of the largest smooth bump is a calm area
```

<!-- zukan: f72 -->
```text
name: けむりまみれ
key: 燻製を急いで当てた丸いチーズ。茶色の煙のむらが片寄ってつき、頭の上に灰色の煙がひとすじ
src: 失敗種（data.py FAIL「燻製を3時間以内で仕上げる」）。ゲーム上の見た目で実在しない
width: 60
subject: one small round cheese shaped like a short cylinder with rounded edges (height about 70% of its diameter) with a pale cream rind (#F2E3BE) that has uneven patchy smoke stains in tan to caramel brown (#C58F4B and #A56E2F), darker on one side and nearly unstained on the other. One thin curly wisp of light grey smoke (#C9C7C2, outlined) rises from the top. Whole, uncut. No fire, no pan, no label.
face: the front of the rounded side is a calm cream area with fewer stains
```

<!-- zukan: f73 -->
```text
name: カビもじゃ
key: ハードのはずが全体がふわふわの白と淡い青緑のうぶ毛でおおわれたかたまり。もじゃもじゃ
src: 失敗種（data.py FAIL「菌なし・圧搾3・しっとりで塩以外」）。ゲーム上の見た目で実在しない
width: 62
subject: one small round wheel of cheese (height about 60% of its diameter) completely covered in a thick, soft, fluffy fur of white and very pale mint-green fuzz (#FAFAF2 and #CFE6D2) in soft round clumps, like a cute fuzzy plush pom-pom with only a hint of golden cheese rind (#E6C070) showing at the bottom edge. Soft and cuddly, not dirty, not dark, no black spots. Whole. No label.
face: the front of the fuzzy side is a broad calm area
```

<!-- zukan: f74 -->
```text
name: すっぱすぎ
key: 置きすぎて黄ばんだフレッシュ。小さな丸いかたまり、表面がしわしわにちぢんでくぼんでいる
src: 失敗種（data.py FAIL「菌なし・圧搾0・しっとりで3日以上」）。ゲーム上の見た目で実在しない
width: 54
subject: one small round ball of fresh cheese that has been left too long: a slightly shrunken, wrinkled, dimpled ball in pale butter yellow (#F5E7A8 with shading #DDC878), with soft crinkles and shallow dents all over like a dried apple, glossy on the raised parts. Wrinkly and pouty but clean and cute. Whole. No mold, no dirt, no bowl, no label.
face: the front of the ball is a broad calm area with fewer wrinkles
```

<!-- zukan: o75 -->
```text
name: きまぐれフレッシュ
key: ぷるんとした真っ白な小さなドーム。てっぺんがゆるくゆれた曲線。つやつや
src: 工房オリジナル（実在の銘柄ではない）。フレッシュの基本の形をやさしく描く
width: 56
subject: one small soft squishy dome of milky white fresh cheese like a little pudding (#FFFEF8 with soft cool-cream shading #ECE5D2), with a smooth wobbly rounded top, a soft sheen, and slightly squashed round base. No swirl, no holes, no rind, no bowl, no plate, no fruit.
face: the front of the dome is a broad smooth calm area
```

<!-- zukan: o76 -->
```text
name: きまぐれ白カビ
key: ふかふかした白いうぶ毛の厚いドーム形。てっぺんがふんわり丸く、切り口なし
src: 工房オリジナル（実在の銘柄ではない）。白カビの基本の形をやさしく描く
width: 58
subject: one thick plump dome-shaped soft-ripened cheese (height about 60% of its diameter) covered with a fluffy velvety white bloom (#FDFBF4 with soft grey-ivory shading #E4DFD0), drawn with a soft cloud-like fuzzy edge and a few gentle cream-coloured shadow patches. Whole, uncut. No streaks, no straw, no wedge, no box, no label.
face: the front of the rounded dome is a broad calm area
```

<!-- zukan: o77 -->
```text
name: きまぐれ青カビ
key: 角の丸いブロック形（四角い）。象牙色の面一面に青緑のすじが走る
src: 工房オリジナル（実在の銘柄ではない）。青カビの基本の形（実在種の円柱と別の、四角いブロック）
width: 56
subject: one chunky block of blue cheese shaped like a rounded-corner cube-like brick (a bit wider than tall), ivory (#F6EFDA with shading #DCD2B4) with many winding blue-green veins and small blue-green pockets (#3F7F78) spread across the front and top faces. Whole block, not a cylinder. No rind wedge, no foil, no label.
face: the front face of the block is a broad area with only a few veins (calm)
```

<!-- zukan: o78 -->
```text
name: きまぐれウォッシュ
key: ぷっくりした丸パンのような橙色のチーズ。つやつやの皮と頭の上に細い3本のにおい線
src: 工房オリジナル（実在の銘柄ではない）。ウォッシュの基本の形（丸パン形）。においは線で表す
width: 56
subject: one plump round loaf-shaped washed-rind cheese like a small bread roll (height about 60% of its diameter), glossy smooth orange rind (#EB8E3C with deeper shading #BE5F25) with a soft sheen. Three thin wavy scent lines in light olive-yellow (#C9C46A, outlined) curl up from above the top. Whole, uncut. No box, no straw, no label, no stamp.
face: the front of the round loaf is a broad smooth calm area
```

<!-- zukan: o79 -->
```text
name: きまぐれシェーブル
key: 太く短い丸太形（ずんぐり）。白い皮に細かい灰のそばかすがちらばる
src: 工房オリジナル（実在の銘柄ではない）。シェーブルの基本の形（ずんぐりの丸太形）
width: 58
subject: one short stubby log-shaped goat's-milk cheese standing upright like a tree stump (height about 90% of its diameter), dry and matte with a cream-white rind (#F6F0E0 with shading #DDD3BA) dotted with small light grey ash freckles (#9A9893). Whole, uncut. No straw, no leaves, no label.
face: the front of the rounded side is a calm area with fewer freckles
```

<!-- zukan: o80 -->
```text
name: きまぐれセミハード
key: 蜂蜜色のすべすべした厚い車輪形。切り口にまんまるの小さな穴がいくつか
src: 工房オリジナル（実在の銘柄ではない）。セミハードの基本の形（蜂蜜色の厚い車輪）
width: 60
subject: one thick plump wheel of semi-hard cheese (height about 50% of its diameter) with softly rounded sides and a smooth honey-yellow rind (#E8B84E with shading #C28F2C). One small wedge is cut out at the front right, showing a pale butter-yellow interior (#F9E9A6) with a few small clean round holes. No wax, no cloth, no wood board, no label, no stamp.
face: the rind on the front left of the cut is a broad, smooth, calm area
```

<!-- zukan: o81 -->
```text
name: きまぐれハード
key: 小ぶりでずっしりした琥珀色の車輪形。切り口は粒々で小さな白い結晶
src: 工房オリジナル（実在の銘柄ではない）。ハードの基本の形（小ぶりの琥珀の車輪）
width: 54
subject: one small, dense, heavy-looking round wheel of hard cheese (height about 55% of its diameter) with straight sides and a smooth hard rind in warm amber (#CF8B35 with shading #A8651C). One small wedge is cut out at the front right, showing a pale golden interior (#F1D07E) with a fine grainy texture and a few tiny white crystal specks. No markings, no wax, no cloth, no wooden board, no label, no stamp.
face: the rind on the front left of the cut is a broad, smooth, calm area
```

<!-- zukan: o82 -->
```text
name: きまぐれのびのび
key: 白くつやつやのチーズひもが、かたつむりのようにぐるぐる巻いた丸いかたまり
src: 工房オリジナル（実在の銘柄ではない）。パスタフィラータの基本のイメージ（伸ばして巻いた形）
width: 58
subject: one thick rope of smooth, glossy, milky white stretched-curd cheese (#FFFDF4 with soft cream shading #EDE4CC) coiled round and round into a neat flat spiral like a snail shell or a cinnamon roll, with a short rounded end of the rope tucked on the outside. Whole. No bowl, no water, no string, no label.
face: the front of the outer coil is a broad smooth calm area
```
