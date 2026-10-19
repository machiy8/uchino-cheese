# -*- coding: utf-8 -*-
import sys, itertools, collections
sys.path.insert(0, sys.argv[1])
from data import *
outpath = sys.argv[2]

STAR = {1:"★",2:"★★",3:"★★★",4:"★★★★"}
TYPES = ["フレッシュ","白カビ","青カビ","ウォッシュ","シェーブル","セミハード","ハード","パスタフィラータ"]
L = []
w = L.append

w("# うちのチーズ 図鑑の分岐表 v1")
w("")
w("作成：2026-10-08　作成者：チーズくん（cheese）　確認日（出典の閲覧日）：2026-10-08／要確認24論点の裏取り反映：2026-10-12（出典R01〜R23、§7-3）")
w("前提：`D:/claude/ai-employee/workspace/reports/チーズ育成ゲームアプリ企画調査.md` §2、`work/企画補足_名前案とペット要素_20261008.md`")
w("")
w("## 0. 要約")
cnt_real = len([s for s in S if not s[14]]); cnt_season = len([s for s in S if s[14]])
w(f"- **全{len(S)+len(FAIL)+len(ORIG)}種** ＝ 実在チーズ{cnt_real}種（8タイプ）＋季節限定{cnt_season}種（実在）＋失敗種{len(FAIL)}種＋工房オリジナル{len(ORIG)}種")
w("- **衝突の自己検証：0件**（§6。全87,360通りの入力を総当たりし、結果が必ず1種に決まること・全82種に到達できることをスクリプトで確認）")
w("- 一言解説は一次情報（AOP/DOPの公的資料・農水省・明治）で確かめたものを書き、2026-10-12に要確認24論点を各国の規程・公的資料で裏取りして反映した（確かめきれず残る点は「未確認」と明記）。入力値の割り当てのうち**ゲーム上の区別のために置いたもの（現実の製法の差ではないもの）は「△」**を付けた")
w("- 失敗種・工房オリジナルは「罰」ではなく図鑑の1枠（Egg Inc の罰なし原則）。工房オリジナルは**実在の銘柄ではないと図鑑に明記**する")
w("")
w("## 1. 入力の定義（プレイヤーの操作）")
w("")
w("| 入力 | 値 | 現実との対応 | 決め方 |")
w("|---|---|---|---|")
w("| 乳 | 牛／山羊／羊／水牛 | 原料乳（S1：原料ミルクの種類で見た目・味が変わる） | 仕込み時に選ぶ |")
w("| 菌（ふりかけ） | なし／白カビ／青カビ／ウォッシュ菌／穴あき菌 | 白カビ・青カビ・リネンス菌（S1）・プロピオン酸菌（S9） | 仕込み時に選ぶ |")
w("| 圧搾（ぎゅっ） | 0〜3 | 0＝型に入れて水を切るだけ／1＝軽く／2＝しっかり（非加熱圧搾）／3＝加熱して強く（加熱圧搾） | 仕込み時のタップ回数 |")
w("| 熟成庫 | しっとり／からっと | 温湿度。カビ系は高湿度（S5：青カビ湿度85〜100%）、ハードは水分を抜く（S1） | 熟成庫を選ぶ |")
w("| 放置時間 | 30分／3時間／12時間／1日／3日／7日／14日 | 現実の熟成期間を圧縮（下表） | 取り出した時点の経過時間で切り下げ。14日以上は14日扱い |")
w("| 手入れ | なし／洗う／返す／針／塩／練る | 洗う＝ウォッシュ（S1）、針＝青カビに空気（S1）、塩＝塩水で拭く・すり込む（S6）、練る＝熱湯で練り伸ばす（S8） | 熟成中に一番多く行った手入れ（0回なら「なし」）。**「練る」は仕込み時のミニゲームで、成功すれば手入れ＝練る**として他より優先 |")
w("| 仕上げ | なし／燻製／葉／木炭／わら／木／酒／ワックス／布／シロン／ハート型／ピラミッド型／四角型 | 燻製・葉・木炭は企画どおり。わら（S3：ブリーの敷きわら・リヴァロの草の帯・サントモールのわら）、木（S3：トウヒ・ブナ）、酒（S1：酒で洗う）、布（S18）、シロン（S15）、型（S3） | 取り出す直前に1つ選ぶ |")
w("| 季節 | 端末の日付 | 季節限定種のみ判定に使う | 自動 |")
w("")
w("**仕上げの拡張について**：依頼の4値（燻製・葉・木炭・なし）では実在種どうしの衝突が解けなかったため、実物の製法に根拠がある9値を足した。ゲームでは**図鑑の登録数に応じて仕上げが1つずつ解放される**作りにして、遊ぶほど作れる種類が増える進行（なめこの「原木の解放」と同じ役割）にする。")
w("")
w("### 1-1. 放置時間の換算（現実の熟成期間 → ゲーム内の実時間）")
w("| 現実 | 熟成なし | 〜2週間 | 〜2か月 | 〜4か月 | 〜12か月 | 12か月超 |")
w("|---|---|---|---|---|---|---|")
w("| ゲーム | 30分／3時間 | 12時間 | 1日 | 3日 | 7日 | 14日 |")
w("")
w("同じタイプ内で並びが逆転しないこと（若いものほど短い）を優先した。境界に近いものや、衝突を解くためにずらしたものは出典欄に「時間△」と書いた。")
w("")
w("### 1-2. 判定の順番")
w("1. **実在種のレシピに完全一致** → その種（季節限定は季節内のみ一致）")
w("2. 一致しなければ **失敗種ルール（§4）を上から順に** 判定 → 最初に当たった失敗種")
w("3. どれにも当たらなければ **工房オリジナル（§5）**：入力からタイプを推定し、そのタイプの「きまぐれ◯◯」")
w("")
w("### 1-3. ヒント設計")
w("- 遊び方の導き（レシピ探しを苦行にしない仕組み）は **`work/ヒント設計_v1.md` に移した**（2026-10-12 d決定）。分岐表は各1通り・衝突0のまま変えず、導き方（相棒のひらめき・はじめてのレシピ帳・タイプのきほん・失敗種の初回ヒント・広告ヒント）で遊びやすくする。全65種のヒント文は `work/ヒント文_一覧_v1.md`（自動生成）、アプリ用データは リポジトリの `zukan_tools/out/hints.json`")
w("- 旧ヒント案（3段式・工房オリジナルの「あと1つ違えば」表示）は本書では持たない。どこが違うかは言わない、という原則だけは引き継ぐ")
w("")
w("## 2. 図鑑（8タイプ・実在種）")
w("")
w("列の見方：圧搾は0〜3、時間は1-1の換算値、レア度は★1〜★4。出典の略号は§7。「△」＝ゲーム上の区別、「未確認」＝一次情報で確かめきれていない。出典の略号Rは2026-10-12の裏取り（§7-3）。")
no = 0
def row(no,s):
    name,origin,typ,m,b,pr,r,t,c,f,rare,ex,per,src,season = s
    return f"| {no} | {name} | {origin} | {typ} | {m} | {b} | {pr} | {r} | {TIME_LABEL[t]} | {c} | {f} | {STAR[rare]} | {ex} | {per} | {src} |"
HDR = "| No | チーズ名 | 原産国 | タイプ | 乳 | 菌 | 圧搾 | 熟成庫 | 放置時間 | 手入れ | 仕上げ | レア度 | 一言解説 | 性格タグ | 出典・注記 |"
SEP = "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"
for typ in TYPES:
    rows = [s for s in S if s[2]==typ and not s[14]]
    w(f"### 2-{TYPES.index(typ)+1}. {typ}（{len(rows)}種）")
    w(HDR); w(SEP)
    for s in rows:
        no += 1; w(row(no,s))
    w("")
w("## 3. 季節限定種（実在・3種）")
w("季節外に同じ入力をすると工房オリジナルになり、「この組み合わせは季節が合えば…」とだけ表示する。")
w("")
w("| No | チーズ名 | 原産国 | タイプ | 乳 | 菌 | 圧搾 | 熟成庫 | 放置時間 | 手入れ | 仕上げ | レア度 | 一言解説 | 性格タグ | 出典・注記 | 季節 |")
w("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")
for s in S:
    if s[14]:
        no += 1; w(row(no,s)[:-1] + f"| {s[14]} |")
w("")
w("## 4. 失敗種（9種・ルール判定）")
w("失敗種も図鑑の1枠。相棒にすることもできる（性格は「いじけてるけど一番なついてくる」系）。上から順に判定し、最初に当たったものになる。")
w("")
w("| No | 名前 | 条件（実在種に一致しなかった場合） | 一言解説（本物の知識） | 性格タグ | 出典・注記 | レア度 |")
w("|---|---|---|---|---|---|---|")
for fid,name,cond,rule,ex,per,src in FAIL:
    no += 1; w(f"| {no} | {name} | {cond} | {ex} | {per} | {src} | ★ |")
w("")
w("## 5. 工房オリジナル（8種・どれにも当たらない組み合わせ）")
w("入力からタイプを推定して「きまぐれ◯◯」にする。図鑑には**「工房オリジナル（実在の銘柄ではありません）」と必ず表示**する（捏造禁止の原則）。")
w("")
w("タイプ推定の順：練る→パスタフィラータ／白カビ→白カビ／青カビ→青カビ／ウォッシュ菌→ウォッシュ／穴あき菌→ハード／山羊→シェーブル／圧搾0→フレッシュ／圧搾3または7日以上→ハード／それ以外→セミハード")
w("")
w("| No | 名前 | 推定タイプ | 性格タグ | レア度 |")
w("|---|---|---|---|---|")
for typ in TYPES:
    no += 1; nm,per = ORIG[typ]; w(f"| {no} | {nm} | {typ} | {per} | ★ |")
w("")

# ---- 検証
w("## 6. 衝突の自己検証（スクリプトで総当たり）")
keys = collections.defaultdict(list)
for s in S: keys[s[3:10]].append(s[0])
dup = {k:v for k,v in keys.items() if len(v)>1}
hit = []
for s in S:
    for fid,name,_,rule,*_ in FAIL:
        if rule(*s[3:10]): hit.append((s[0],name))
w("")
w(f"- **検証1：実在種どうしの入力の重複＝{len(dup)}件**（季節を無視して7入力で比較。季節限定種も通年種と重ならない）")
w(f"- **検証2：実在種のレシピが失敗ルールにも当たる＝{len(hit)}件**（正しく作ったのに失敗扱い、が起きない）")
res = {}
for mode in ("季節内","季節外"):
    exact = {s[3:10]:s[0] for s in S if not (s[14] and mode=="季節外")}
    cnt = collections.Counter(); total=0
    for k in itertools.product(MILK,BAC,PRESS,ROOM,TIME,CARE,FIN):
        total+=1
        if k in exact: cnt[exact[k]]+=1; continue
        for fid,name,_,rule,*_ in FAIL:
            if rule(*k): cnt["失敗:"+name]+=1; break
        else: cnt["工房:"+ORIG[infer_type(*k)][0]]+=1
    res[mode]=(total,cnt)
t,c = res["季節内"]
w(f"- **検証3：全入力 {t:,} 通り（乳4×菌5×圧搾4×庫2×時間7×手入れ6×仕上げ13）を総当たり** → 1通りにつき結果は必ず1種。到達した種類は {len(c)} 種＝全{len(S)+len(FAIL)+len(ORIG)}種（到達できない種＝0）。季節外は季節限定3種を除く{len(res['季節外'][1])}種に到達")
w("- 検証4：一言解説はすべて30字以内")
w("")
w("失敗種・工房オリジナルに落ちる入力の数（季節内）：")
w("")
w("| 結果 | 通り数 |")
w("|---|---|")
for n,v in sorted(((n,v) for n,v in c.items() if n.startswith(("失敗:","工房:"))), key=lambda x:-x[1]):
    w(f"| {n.split(':')[1]} | {v:,} |")
w("")
w("**衝突を解いた箇所（ゲーム上の区別＝△）**：実物でも作り方がほぼ同じチーズ（例：ゴルゴンゾーラとスティルトン、セル・シュル・シェールとヴァランセ、マスカルポーネとクリームチーズ）は、指示どおり**時間と仕上げで分けた**。それでも分けられなかったフルム・ダンベール／ブルー・ドーヴェルニュは圧搾を1にずらした（実物はどちらも圧搾しない（AOP規程）。圧搾1はゲーム上の区別）。いずれも出典欄に△を付け、**図鑑の解説文には△の割り当てを書かない**（ゲームの入力と現実の製法を混同させない）。")
w("")
w("検証スクリプト：リポジトリ uchino-cheese の `zukan_tools/`（ローカルは `D:/codex/チーズ育成/zukan_tools/`。2026-10-19 work/ から移設）（再生成：`python -I gen.py <このフォルダ> <出力md>`）（data.py＝図鑑データ、gen.py＝本ファイル生成＋検証）。実装時はこのデータをそのままJSON化して使える。")
w("")
w("## 7. 出典と確認日（すべて2026-10-08に閲覧）")
w("")
w("| 略号 | 出典 | 種別 | 使った内容 |")
w("|---|---|---|---|")
SRC = [
("S1","農林水産省『aff』2022年6月号「チーズのプロがナビゲート！国産チーズを学ぼう」 https://www.maff.go.jp/j/pr/aff/2206/spe1_02.html","一次（官公庁）","7タイプの定義、各タイプの代表例、セミハード水分38〜46%、シェーブルの炭、青カビは空気が要る、7工程"),
("S2","明治「知っ得!品質マメ知識 チーズ編」 https://www.meiji.co.jp/meiji-shokuiku/know/knowledge/cheese_world/","一次（乳業メーカー）","6分類、白カビは熟成でとろり、ハード・超ハード（1〜2年）"),
("S3","CNAOL／CNIEL『AOP 45 Fromages, 3 Beurres, 2 Crèmes』パンフレット https://www.produits-laitiers-aop.fr/wp-content/uploads/2021/09/AOP_brochure.pdf","一次（仏AOP全国評議会）","仏AOP各チーズの乳種・熟成期間・形・わら・木炭・木・季節（モン・ドール、サレール、ボーフォール）"),
("S4","Parmigiano Reggiano 協会 生産規程（Disciplinare） https://backend.parmigianoreggiano.com/uploads/Disciplinare_Parmigiano_Reggiano_1a92c5e19a.pdf","一次（DOP協会）","無殺菌の部分脱脂乳、12か月以上"),
("S5","Gorgonzola DOP 生産規程（農業省2017年告示） https://www.unionalimentari.com/wp-content/uploads/2024/09/Mipaaf-Provv-27.9.2017-GorgonzolaCOMPL.pdf","一次（伊農業省）","ドルチェ50日〜、ピカンテ80日〜、熟成湿度85〜100%"),
("S6","Taleggio DOP 生産規程（農業省2022年告示） https://www.unionalimentari.com/wp-content/uploads/2024/09/MIPAAF-Provv-8.7.2022-mod-disc-TALEGGIO-CP.pdf","一次（伊農業省）","35日以上、約7日ごとに塩水で拭く、四角形"),
("S7","ONAF ペコリーノ・ロマーノ解説 https://www.onaf.it/uploads/public/11795_pecorino-romano.pdf","二次（伊チーズ鑑定士協会）","羊乳、卓上用5か月・おろし用8か月（規程本文はR12で確認済み）"),
("S8","ONAF モッツァレラ・ディ・ブーファラ・カンパーナ解説 https://www.onaf.it/uploads/public/16935_mozzarella-bufala-campana.pdf","二次","水牛乳、熱湯で練り伸ばす（規程本文はR13で確認済み）"),
("S9","スイス連邦農業局 Emmentaler AOP 仕様書改正（2025） https://www.blw.admin.ch/ ／ emmentaler.ch","一次（スイス連邦）","プロピオン酸発酵、120日以上"),
("S10","Stilton：英語版Wikipedia・Castello ほか","二次","3州・殺菌乳・針で穴。※「9週」は規程になく削除。一次はR18（DEFRA仕様書）に差し替え済み"),
("S11","DOP Queso Manchego 仕様書（2025・カスティーリャ＝ラ・マンチャ州） https://apliagri.castillalamancha.es/sites/default/files/2026-07/Pliego_Condiciones_DOP_Queso_Manchego_2025_0.pdf","一次（州政府）","1.5kg以下30日・それ以外60日以上"),
("S12","ONAF グラナ・パダーノ／プロヴォローネ・ヴァルパダーナ（GUUE 2019/C 114）／カチョカヴァッロ・シラーノ 各資料 https://www.onaf.it/","一次＋二次","グラナ9〜24か月、プロヴォローネのドルチェ（子牛レンネット）・ピカンテ（子山羊・子羊）、カチョカヴァッロは南伊5州"),
("S13","欧州委員会 Feta PDO 仕様（eAmbrosia） https://agriculture.ec.europa.eu/farming/geographical-indications-and-quality-schemes/geographical-indications-food-and-drink/feta-pdo_en","一次（EU）","羊乳70%以上＋山羊乳30%まで、塩水、2か月以上"),
("S14","Burrata di Andria IGP（農業省2016年告示） https://unionalimentari.com/wp-content/uploads/2024/09/MIPAAF-Provvedimento-5.12.2016-Burrata-di-AndriaCOMPL.pdf","一次（伊農業省）","パスタフィラータの袋に生クリームと裂いた生地、葉で包む"),
("S15","フランス国民議会 書面質問 QE30819 回答 https://questions.assemblee-nationale.fr/dyn/14/questions/QANR5L14QE30819.pdf ほか","一次（仏議会）＋二次","ミモレットのダニ（シロン）、熟成区分（18か月超＝エクストラヴィエイユは二次情報）"),
("S16","スイスAOP-IGP協会 Tête de Moine AOP https://www.aop-igp.ch/en/tete-de-moine-aop","一次（AOP協会）","トウヒ板で75日以上、ジロールで削る、名の由来"),
("S17","Gouda Holland PGI 単一文書（EU） https://www.dfat.gov.au/sites/default/files/142f.pdf","一次（EU文書の写し）","28日以上の自然熟成"),
("S18","West Country Farmhouse Cheddar：cheesescientist.com ほか","二次","チェダリング、9か月以上、布巻き。※一次はR19（DEFRA仕様書）に差し替え済み"),
("S19","スイスAOP-IGP協会 Gruyère AOP／Raclette du Valais AOP 製品チラシ（2025） https://www.aop-igp.ch/","一次（AOP協会）","グリュイエール5か月以上・トウヒ板・塩水で磨く、ラクレット3か月以上・トウヒ板"),
]
for a,b,cc,d in SRC: w(f"| {a} | {b} | {cc} | {d} |")
w("")
w("### 7-1. 残っている未確認（2026-10-12時点）")
w("- リコッタ：DOPでない一般のリコッタの乳種を定める伊の一次資料は未読（乳＝羊はリコッタ・ロマーナDOPの話として注記済み）")
w("- 州のPAT登録票の多くはONAF掲載の写しで読んだ（州の原本URLは未確認）。カンパーニア州のスカモルツァ燻製の要約は二次情報")
w("- INAO extranetのPDFは異議手続き版が混ざり、現行の施行版と細部が違う可能性がある（版の日付は§7-3に記載）")
w("")
w("### 7-2. 詳細解説（一言解説の30字に入らない補足）")
for k,v in DETAIL.items(): w(f"- {k}：{v}")
w("")
w("### 7-3. 裏取り出典R（2026-10-12に閲覧。詳細は work/裏取り_FR・IT・UKNLUS_20261012.md）")
w("| 略号 | 出典 | 版 |")
w("|---|---|---|")
RSRC = [
("R01","INAO 仕様書 Roquefort https://extranet.inao.gouv.fr/fichier/PNOCDCRoquefort.pdf §5.3・5.4","2017-01-26 承認の改正案版"),
("R02","INAO 仕様書 Bleu d'Auvergne https://extranet.inao.gouv.fr/fichier/PNOCDCBleudAuvergne.pdf §4.2・4.5・4.6","2014-07-21"),
("R03","INAO 仕様書 Fourme d'Ambert https://extranet.inao.gouv.fr/fichier/PNOCDCFourmedAmbert.pdf §IV.2・5.3・5.4","2013-04-25"),
("R04","INAO 仕様書 Époisses https://extranet.inao.gouv.fr/fichier/CDCEpoisses.pdf §5.15・5.17","version n°1 2010-04-16"),
("R05","INAO 仕様書 Langres https://extranet.inao.gouv.fr/fichier/CDCLangres.pdf §2・5.4・6","2008-06-04"),
("R06","INAO 仕様書 Reblochon https://extranet.inao.gouv.fr/fichier/PNOCDCReblochon.pdf §2・5.6.1","異議手続き版（日付記載なし）"),
("R07","INAO 仕様書 Mâconnais https://extranet.inao.gouv.fr/fichier/CDCMaconnais.pdf §2・5.3.5","2008-06-04"),
("R08","INAO 仕様書 Chevrotin https://extranet.inao.gouv.fr/fichier/PNOCDCChevrotin.pdf §5.2.4・5.2.5・5.3","異議手続き版（日付記載なし）"),
("R09","INAO 仕様書 Mont d'Or https://extranet.inao.gouv.fr/fichier/CDCPNOMontdOr241121.pdf §2・5.6・5.7","2024-12-31 承認の改正案版"),
("R10","INAO 仕様書 Beaufort https://extranet.inao.gouv.fr/fichier/PNOCDCBeaufort.pdf §5.4.5・5.4.6","version n°14 2010-11-08"),
("R11","EU官報 GUUE C 111（2008-05-06）Gorgonzola 単一文書4.5","2008-05-06"),
("R12","EU官報 GUUE L 283（2009-10-30）規則(EC)1030/2009 Pecorino Romano 単一文書4.2・4.5／IFCQ管理計画 Rev.0（2023-12-05）","2009-10-30／2023-12-05"),
("R13","EU官報 GUUE C 90（2007-04-25）Mozzarella di Bufala Campana 単一文書4.5（規則(EC)103/2008で承認）","2007-04-25"),
("R14","EU官報 GUUE C 101（2010-04-20）Ricotta Romana 単一文書3.2・3.3・3.6・4.3","2010-04-20"),
("R15","ラツィオ州 PAT登録票 Fiordilatte dell'Agro Pontino（ONAF掲載の写し） https://www.onaf.it/uploads/public/formaggi/18121_fiordilatte-dell-agro-pontino-scheda-regione.pdf","2022-09-27"),
("R12b","伊農林食糧主権省(MASAF)省令 2026-03-30 Pecorino Romano 規程統合版（GU一般版n.81・2026-04-08・26A01694） https://www.gazzettaufficiale.it/eli/id/2026/04/08/26A01694/sg","2026-04-08"),
("R16","スカモルツァ：モリーゼ州ARSARP地図帳・アブルッツォ州／バジリカータ州／プーリア州のPAT登録票・ARSIAL（ONAF掲載の写しほか）","各州"),
("R17","カンパーニア州農業部 Provola affumicata（ONAF掲載の写し） https://www.onaf.it/uploads/public/formaggi/14163_provola-affumicata-reg-campania.pdf","2019-11-23保存"),
("R18","DEFRA Stilton PDO 仕様書 §4.1〜4.6 https://assets.publishing.service.gov.uk/media/5fd3677c8fa8f54d564af06b/pfn-stilton-cheese.pdf","DEFRA掲載版"),
("R19","DEFRA West Country Farmhouse Cheddar PDO 仕様書 §4.2〜4.6 https://assets.publishing.service.gov.uk/media/5fd3693f8fa8f54d59e8b750/pfn-west-country-farmhouse-cheddar.pdf","DEFRA掲載版"),
("R20","規則(EU)1122/2010 Gouda Holland PGI 単一文書4.2・4.5／RVO製品仕様書 https://www.rvo.nl/sites/default/files/2026-09/Productdossier-BGA-Gouda-Holland.pdf／eAmbrosia attachment 64068","2010／2018改正"),
("R21","規則(EU)1121/2010 Edam Holland PGI 単一文書4.2・4.5／RVO製品仕様書 https://www.rvo.nl/sites/default/files/2026-09/Productdossier-BGA-Edam-Holland.pdf","2010"),
("R22","米 21 CFR 133.133 https://www.law.cornell.edu/cfr/text/21/133.133 ／ Codex CXS 275-1973","—"),
("R23","米 21 CFR 133.128・133.129 https://www.law.cornell.edu/cfr/text/21/133.129 ／ Codex CXS 273-1968","—"),
]
for a,b,cc in RSRC: w(f"| {a} | {b} | {cc} |")
w("- 確認先の候補：チーズプロフェッショナル協会（CPA）の教本『チーズの教本』、各国の生産者協会の規程本文、雪印メグミルク・六甲バターの解説ページ（今回の検索では個別解説ページに届かず）")
w("")
w("## 8. 実装メモ（チーズくん自律判断）")
w("- データは本表をJSON（`cheeses.json`）に起こし、アプリとWeb図鑑（SEOページ）で共用する。Web図鑑の1種1ページは「一言解説」＋出典の一次情報をもとに300〜800字に膨らませる（ここは別タスク）")
w("- △の割り当ては図鑑本文に出さない。ゲーム内では「レシピ」として見せるだけにする")
w("- 失敗種・工房オリジナルも図鑑のコンプ対象に含める（コンプ率の分母＝82）")

open(outpath,"w",encoding="utf-8").write("\n".join(L)+"\n")
print("written", no)
