# -*- coding: utf-8 -*-
import sys, itertools, collections
sys.path.insert(0, sys.argv[1])
from data import *

out = []
p = out.append
keys = collections.defaultdict(list)
for s in S:
    k = s[3:10]
    keys[k].append(s[0])
dup = {k:v for k,v in keys.items() if len(v)>1}
p(f"実在種(季節含む)={len(S)} 失敗種={len(FAIL)} 工房オリジナル={len(ORIG)} 合計={len(S)+len(FAIL)+len(ORIG)}")
p(f"[検証1] 実在種どうしの入力キー重複（季節を無視して比較）: {len(dup)}件 {dup}")

hit = []
for s in S:
    m,b,pr,r,t,c,f = s[3:10]
    for fid,name,_,rule,*_ in FAIL:
        if rule(m,b,pr,r,t,c,f): hit.append((s[0],fid))
p(f"[検証2] 実在種のレシピが失敗ルールにも当たる件数: {len(hit)} {hit}")

for mode in ("季節内","季節外"):
    exact = {}
    for s in S:
        if s[14] and mode=="季節外": continue
        exact[s[3:10]] = s[0]
    cnt = collections.Counter()
    total = 0
    for k in itertools.product(MILK,BAC,PRESS,ROOM,TIME,CARE,FIN):
        total += 1
        if k in exact: cnt[exact[k]] += 1; continue
        for fid,name,_,rule,*_ in FAIL:
            if rule(*k): cnt["失敗:"+name] += 1; break
        else:
            cnt["工房:"+ORIG[infer_type(*k)][0]] += 1
    p(f"[検証3:{mode}] 全入力 {total} 通り → 結果は必ず1つ。到達した種類数 {len(cnt)} / 合計件数 {sum(cnt.values())}")
    unreached = [n for n in [s[0] for s in S if not (s[14] and mode=='季節外')]+["失敗:"+x[1] for x in FAIL]+["工房:"+v[0] for v in ORIG.values()] if cnt[n]==0]
    p(f"   到達しない種: {unreached}")
    if mode=="季節内":
        for n in ["失敗:"+x[1] for x in FAIL]+["工房:"+v[0] for v in ORIG.values()]:
            p(f"   {n}: {cnt[n]}通り")

long = [(s[0],len(s[11])) for s in S if len(s[11])>30] + [(x[1],len(x[4])) for x in FAIL if len(x[4])>30]
p(f"[検証4] 解説30字超: {long}")
tc = collections.Counter(s[2] for s in S if not s[14])
p(f"タイプ別（季節除く）: {dict(tc)}  季節: {sum(1 for s in S if s[14])}")
rc = collections.Counter(s[10] for s in S)
p(f"レア度: {dict(sorted(rc.items()))}")
print("\n".join(out))
