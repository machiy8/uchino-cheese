// 図鑑 S4：82枠・登録数/82。登録済み＝体の絵＋顔・名前・作った回数。未登録の実在種＝黒いシルエット＋名前、
// 未登録の失敗種・工房＝「？？？」。押すと詳細（登録済みだけ）。レシピカード・ねらい（S4b の残り）は W4
import type { Registered } from '../game/state'
import { speciesFile, type Species } from '../game/zukan'
import { CheeseFigure } from './CheeseFigure'
import { kindLabel, ORIG_NOTE, pad2 } from './format'
// 一覧の格子・カード・詳細の重ね方・ボタンは確認用の図鑑ページと同じ見た目を使う
import '../pages/ZukanCheck.css'

/** no 順の82種 */
export const zukanOrder: Species[] = [...speciesFile.species].sort((a, b) => a.no - b.no)

export function ZukanPage({
  registered,
  onOpen,
}: {
  registered: Record<string, Registered>
  onOpen: (id: string) => void
}) {
  const count = zukanOrder.filter((s) => registered[s.id]).length
  return (
    <section className="page" aria-labelledby="zukan-title">
      <h1 id="zukan-title" className="page-title">
        図鑑 <span className="zukan-progress">{count}/{zukanOrder.length}</span>
      </h1>
      <ul className="zukan-grid">
        {zukanOrder.map((s) => {
          const r = registered[s.id]
          if (r) {
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className="zukan-card"
                  data-card={s.id}
                  data-state="registered"
                  onClick={() => onOpen(s.id)}
                >
                  <CheeseFigure id={s.id} size="512" lazy />
                  <span className="zukan-card-no">No.{pad2(s.no)}</span>
                  <span className="zukan-card-name">{s.name}</span>
                  <span className="zukan-card-count">{r.count}回</span>
                </button>
              </li>
            )
          }
          if (s.kind === 'real') {
            return (
              <li key={s.id}>
                <div className="zukan-card zukan-card-locked" data-card={s.id} data-state="silhouette">
                  <CheeseFigure id={s.id} size="512" lazy silhouette />
                  <span className="zukan-card-no">No.{pad2(s.no)}</span>
                  <span className="zukan-card-name">{s.name}</span>
                </div>
              </li>
            )
          }
          return (
            <li key={s.id}>
              <div className="zukan-card zukan-card-locked" data-card={s.id} data-state="secret">
                <div className="figure figure-secret" aria-hidden="true">
                  <span>？</span>
                </div>
                <span className="zukan-card-no">No.{pad2(s.no)}</span>
                <span className="zukan-card-name">？？？</span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** 登録済みの種の詳細（体は 1024px・届くまで 512px） */
export function ZukanEntry({
  species: s,
  registered: r,
  onClose,
}: {
  species: Species
  registered: Registered
  onClose: () => void
}) {
  return (
    <div className="zukan-detail" role="dialog" aria-modal="true" aria-label={s.name}>
      <div className="zukan-detail-inner">
        <header className="zukan-detail-head">
          <div>
            <div className="zukan-card-no">No.{pad2(s.no)}</div>
            <h2>{s.name}</h2>
          </div>
          <button type="button" className="btn btn-close" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </header>
        <div className="zukan-detail-figure">
          <CheeseFigure id={s.id} size="1024" />
        </div>
        <dl className="entry-meta">
          <dt>種類</dt>
          <dd>{kindLabel(s)}</dd>
          {s.kind === 'real' && (
            <>
              <dt>原産</dt>
              <dd>{s.origin}</dd>
            </>
          )}
          {s.kind === 'real' && s.seasonText && (
            <>
              <dt>季節</dt>
              <dd>{s.seasonText}</dd>
            </>
          )}
          <dt>作った回数</dt>
          <dd>{r.count}回</dd>
          <dt>はじめて</dt>
          <dd>{r.firstAt}</dd>
        </dl>
        <p className="result-expl">{s.kind === 'orig' ? ORIG_NOTE : s.expl}</p>
      </div>
    </div>
  )
}
