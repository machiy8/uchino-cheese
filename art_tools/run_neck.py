import json,sys
import neck_calc as N
ids=list(N.FACES)
sys.stdout.reconfigure(encoding="utf-8")
out="D:/claude/チーズ育成/art/extras/"
for i,(a,b) in enumerate([(0,28),(28,56),(56,82)]):
    st=N.sheet(ids[a:b], out+f"確認_くびの品_口の下_{i+1}_20261018.png", f"くびの品（左F4リボン・右F5スカーフ）を口の下の式で重ねた確認 {i+1}/3（{ids[a]}〜{ids[b-1]}）")
    print(i+1, {k:v for k,v in st.items() if v!='式'}, flush=True)
print("END",flush=True)
