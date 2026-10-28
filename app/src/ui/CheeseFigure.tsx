// 体の絵＋顔（SVG）。絵が目録に無ければ「絵なし」の枠に顔だけ出す。
// silhouette：未登録の実在種（体の絵を黒く塗る・顔は出さない）
// 1024px は届くまでの間 512px を下に出しておく（届いたら 512px を外す）
import { useEffect, useRef, useState } from 'react'
import { bodyImage, type BodySize } from '../assets/catalog'
import { FaceGroup, speciesFaces, type Expr } from '../face'
import './CheeseFigure.css'

interface Props {
  id: string
  size: BodySize
  expr?: Expr
  lazy?: boolean
  silhouette?: boolean
}

export function CheeseFigure(props: Props) {
  // 種が変わったら「1024px が届いたか」を数え直す
  return <Figure key={`${props.id}-${props.size}`} {...props} />
}

function Figure({ id, size, expr = 'normal', lazy = false, silhouette = false }: Props) {
  const img = bodyImage(id, size)
  const small = size === '1024' ? bodyImage(id, '512') : null
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLImageElement>(null)
  useEffect(() => {
    // キャッシュから読んだときは onLoad より先に読み終わっていることがある
    if (ref.current?.complete && ref.current.naturalWidth > 0) setLoaded(true)
  }, [])
  const f = speciesFaces[id]
  const w = img?.w ?? 1000
  const h = img?.h ?? 1000
  const cls = ['figure', img ? '' : 'figure-missing', silhouette ? 'figure-silhouette' : ''].filter(Boolean).join(' ')
  return (
    <div className={cls} style={{ aspectRatio: `${w} / ${h}` }} data-id={id}>
      {small && !loaded && (
        <img className="figure-placeholder" src={small.url} width={w} height={h} alt="" decoding="async" />
      )}
      {img ? (
        <img
          ref={ref}
          src={img.url}
          width={w}
          height={h}
          alt=""
          loading={lazy ? 'lazy' : undefined}
          decoding="async"
          onLoad={() => setLoaded(true)}
        />
      ) : (
        <span className="figure-missing-label">絵なし</span>
      )}
      {f && !silhouette && (
        <svg className="figure-face" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
          <FaceGroup faceType={f.faceType} expr={expr} faceW={f.w} cx={f.cx} cy={f.cy} tilt={f.tilt} width={w} height={h} />
        </svg>
      )}
    </div>
  )
}
