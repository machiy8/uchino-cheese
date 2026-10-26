// 確認用の図鑑ページ（W1）。82種を顔つきで並べ、1種を押すと11表情を切り替えて見られる。
// 当面はアプリのトップに出す。W2 以降で画面の骨組み（S4 図鑑）に置き換える前提で、ここに閉じて作る。
// 未登録のシルエットの出し分けは W4（今回は全種を見せる）
import { useCallback, useEffect, useMemo, useState } from 'react'
import { bodyImage, type BodySize } from '../assets/catalog'
import { buildInfo } from '../buildInfo'
import { EXPRS, EXPR_JA, FaceGroup, faceStyle, lineWidthFor, speciesFaces, type Expr } from '../face'
import { speciesFile, type Species } from '../game/zukan'
import './ZukanCheck.css'

const KIND_JA: Record<Species['kind'], string> = { real: '実在', fail: '失敗', orig: '工房' }
const KINDS = Object.keys(KIND_JA) as Species['kind'][]
const FACE_TYPES = Object.keys(faceStyle.types)

/** no 順の82種 */
export const zukanSpecies: Species[] = [...speciesFile.species].sort((a, b) => a.no - b.no)

const pad = (no: number) => String(no).padStart(2, '0')

/** 体の絵＋顔（SVG）。絵が目録に無ければ「絵なし」の枠に顔だけ出す */
export function CheeseFigure({
  id,
  size,
  expr = 'normal',
  lazy = false,
}: {
  id: string
  size: BodySize
  expr?: Expr
  lazy?: boolean
}) {
  const img = bodyImage(id, size)
  const f = speciesFaces[id]
  const w = img?.w ?? 1000
  const h = img?.h ?? 1000
  return (
    <div className={img ? 'figure' : 'figure figure-missing'} style={{ aspectRatio: `${w} / ${h}` }} data-id={id}>
      {img ? (
        <img src={img.url} width={w} height={h} alt="" loading={lazy ? 'lazy' : undefined} decoding="async" />
      ) : (
        <span className="figure-missing-label">絵なし</span>
      )}
      {f && (
        <svg className="figure-face" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
          <FaceGroup faceType={f.faceType} expr={expr} faceW={f.w} cx={f.cx} cy={f.cy} tilt={f.tilt} width={w} height={h} />
        </svg>
      )}
    </div>
  )
}

export function ZukanList({ items, onOpen }: { items: Species[]; onOpen: (id: string) => void }) {
  return (
    <ul className="zukan-grid">
      {items.map((s) => {
        const f = speciesFaces[s.id]
        return (
          <li key={s.id}>
            <button type="button" className="zukan-card" data-card={s.id} onClick={() => onOpen(s.id)}>
              <CheeseFigure id={s.id} size="512" lazy />
              <span className="zukan-card-no">
                No.{pad(s.no)} <span className={`kind kind-${s.kind}`}>{KIND_JA[s.kind]}</span>
              </span>
              <span className="zukan-card-name">{s.name}</span>
              <span className="zukan-card-type">{f?.faceType ?? '顔なし'}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function ZukanDetail({
  species,
  expr,
  onExpr,
  prev,
  next,
  onMove,
  onClose,
}: {
  species: Species
  expr: Expr
  onExpr: (e: Expr) => void
  prev: Species | null
  next: Species | null
  onMove: (id: string) => void
  onClose: () => void
}) {
  const f = speciesFaces[species.id]
  return (
    <div className="zukan-detail" role="dialog" aria-modal="true" aria-label={species.name}>
      <div className="zukan-detail-inner">
        <header className="zukan-detail-head">
          <div>
            <div className="zukan-card-no">
              No.{pad(species.no)} <span className={`kind kind-${species.kind}`}>{KIND_JA[species.kind]}</span> {species.id}
            </div>
            <h2>{species.name}</h2>
          </div>
          <button type="button" className="btn btn-close" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </header>

        <div className="zukan-detail-figure">
          <CheeseFigure id={species.id} size="1024" expr={expr} />
        </div>

        <div className="expr-buttons" role="group" aria-label="表情">
          {EXPRS.map((e) => (
            <button
              key={e}
              type="button"
              className="btn btn-expr"
              aria-pressed={e === expr}
              data-expr={e}
              onClick={() => onExpr(e)}
            >
              {EXPR_JA[e]}
            </button>
          ))}
        </div>

        <nav className="zukan-detail-nav">
          <button type="button" className="btn" disabled={!prev} onClick={() => prev && onMove(prev.id)}>
            ← {prev ? `No.${pad(prev.no)}` : '前'}
          </button>
          <button type="button" className="btn" disabled={!next} onClick={() => next && onMove(next.id)}>
            {next ? `No.${pad(next.no)}` : '次'} →
          </button>
        </nav>

        {f ? (
          <dl className="zukan-meta">
            <dt>顔の型</dt>
            <dd>
              {f.faceType}（{faceStyle.types[f.faceType]?.ja ?? '型なし'}）
            </dd>
            <dt>w</dt>
            <dd>{f.w}</dd>
            <dt>tilt</dt>
            <dd>{f.tilt ?? 0}</dd>
            <dt>線の太さ</dt>
            <dd>
              {lineWidthFor(faceStyle, f.w)}（{faceStyle.lineWidthImagePermille}×1000÷{f.w}）
            </dd>
            <dt>checked</dt>
            <dd>{f.checked ?? '—'}</dd>
          </dl>
        ) : (
          <p className="zukan-meta">faces.json にこの種の顔が無い</p>
        )}
      </div>
    </div>
  )
}

export function BuildFooter() {
  return (
    <footer className="build-footer">
      版 <code>{buildInfo.commit}</code>・ビルド {buildInfo.builtAt}
    </footer>
  )
}

export default function ZukanCheck({ initialId = null }: { initialId?: string | null }) {
  const [kind, setKind] = useState<Species['kind'] | ''>('')
  const [faceType, setFaceType] = useState('')
  const [openId, setOpenId] = useState<string | null>(initialId)
  const [expr, setExpr] = useState<Expr>('normal')

  const items = useMemo(
    () =>
      zukanSpecies.filter(
        (s) => (!kind || s.kind === kind) && (!faceType || speciesFaces[s.id]?.faceType === faceType),
      ),
    [kind, faceType],
  )

  // 前後は絞り込んだ一覧の中で移る（絞り込みの外の種を開いているときは全種の並びで）
  const order = openId && items.some((s) => s.id === openId) ? items : zukanSpecies
  const idx = openId ? order.findIndex((s) => s.id === openId) : -1
  const current = idx >= 0 ? order[idx] : null

  const open = useCallback((id: string) => {
    // ブラウザ・Android の「戻る」で詳細を閉じられるように、開くときに履歴を1つ積む
    window.history.pushState({ zukanCheck: id }, '')
    setOpenId(id)
  }, [])

  const move = useCallback((id: string) => {
    window.history.replaceState({ zukanCheck: id }, '')
    setOpenId(id)
  }, [])

  const close = useCallback(() => {
    if (window.history.state?.zukanCheck) window.history.back()
    else setOpenId(null)
  }, [])

  useEffect(() => {
    const onPop = () => setOpenId(window.history.state?.zukanCheck ?? null)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    if (!openId) return
    // 詳細を出している間は後ろの一覧を動かさない（閉じると同じ位置のまま）
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
      // 詳細の中で前後に移ったときは、その種のカードが見える所までだけ動かす（見えていれば動かない）
      document.querySelector(`[data-card="${openId}"]`)?.scrollIntoView({ block: 'nearest' })
    }
  }, [openId, close])

  return (
    <main className="zukan-check">
      <header className="zukan-check-head">
        <h1>図鑑の確認</h1>
        <div className="zukan-filters">
          <label>
            種類
            <select value={kind} onChange={(e) => setKind(e.target.value as Species['kind'] | '')}>
              <option value="">すべて</option>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_JA[k]}
                </option>
              ))}
            </select>
          </label>
          <label>
            顔の型
            <select value={faceType} onChange={(e) => setFaceType(e.target.value)}>
              <option value="">すべて</option>
              {FACE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <span className="zukan-count">
            {items.length}/{zukanSpecies.length}種
          </span>
        </div>
      </header>

      <ZukanList items={items} onOpen={open} />

      <BuildFooter />

      {current && (
        <ZukanDetail
          species={current}
          expr={expr}
          onExpr={setExpr}
          prev={idx > 0 ? order[idx - 1] : null}
          next={idx < order.length - 1 ? order[idx + 1] : null}
          onMove={move}
          onClose={close}
        />
      )}
    </main>
  )
}
