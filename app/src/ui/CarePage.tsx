// お手入れ S3b：4つのボタン。押すと回数が増え、いまの「決まる手入れ」を出す
import { decideCare } from '../game/cellar'
import { CARE_BUTTONS, type AgingSlot, type CareButton } from '../game/state'
import { inputSummary } from './CellarPage'

export function CarePage({
  aging,
  readOnly = false,
  onCare,
  onBack,
}: {
  aging: AgingSlot
  readOnly?: boolean
  onCare: (care: CareButton) => void
  onBack: () => void
}) {
  const decided = decideCare(aging)
  return (
    <section className="page sub" aria-labelledby="care-title">
      <header className="sub-head">
        <button type="button" className="btn" onClick={onBack}>
          ← 熟成棚
        </button>
        <span className="sub-head-note">
          枠{aging.slot}：{inputSummary(aging)}
        </span>
      </header>
      <h1 id="care-title" className="page-title">
        お手入れ
      </h1>
      <div className="choice-grid care-grid">
        {CARE_BUTTONS.map((c) => (
          <button
            key={c}
            type="button"
            className="btn btn-choice"
            data-care={c}
            disabled={readOnly}
            onClick={() => onCare(c)}
          >
            <span className="care-name">{c}</span>
            <span className="care-count">{aging.careLog[c]}回</span>
          </button>
        ))}
      </div>
      <p className="care-decided">
        いまの手入れ：<strong data-decided={decided}>{decided}</strong>
      </p>
      <p className="note">
        {aging.careLog['練る'] > 0
          ? '仕込みで練ったので、手入れは「練る」になります'
          : 'いちばん多く行った手入れで決まります（同じ回数なら最後に行った方）'}
      </p>
    </section>
  )
}
