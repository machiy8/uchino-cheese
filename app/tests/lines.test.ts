// 相棒のセリフ（src/data/lines/lines.json）：形・全組み合わせで必ず1本出る・同じ行が続かない・NG語の検査
// NG語の判定は docs/specs/ng_check.py と同じ（正規化：NFKC → カタカナをひらがなへ → 英字は小文字 → 「ー・〜♪☆！？」等を除く／
// 照合：partial＝部分一致・exact＝完全一致。印の解釈は書き出しの ng_words.json の match に入っている）
import { describe, expect, it } from 'vitest'
import { STAGES } from '../src/game/buddy'
import { LINE_SCENES, LINE_STATES, LINE_TIMES, linesFile, matchingLines, pickLine, timeOfDay, type LineQuery } from '../src/game/lines'
import ngJson from '../src/data/generated/ng_words.json'
import { gameParams } from '../src/game/zukan'

const TYPES = gameParams.buddy.types // 8タイプ＋fail＋orig
const REMOVE = new Set('ー・〜♪☆！？!?~～･ｰ')

/** ng_check.py の norm と同じ */
function norm(s: string): string {
  const n = s.normalize('NFKC').trim()
  const hira = [...n].map((c) => (c >= 'ァ' && c <= 'ヶ' ? String.fromCharCode(c.charCodeAt(0) - 0x60) : c)).join('')
  return [...hira.toLowerCase()].filter((c) => !REMOVE.has(c)).join('')
}

interface NgWord {
  word: string
  match: 'partial' | 'exact'
}
const ng = (ngJson as { words: NgWord[] }).words.map((w) => ({ ...w, n: norm(w.word) }))

function ngHits(text: string): string[] {
  const n = norm(text)
  return ng.filter((w) => (w.match === 'partial' ? n.includes(w.n) : n === w.n)).map((w) => w.word)
}

describe('NG語の判定（ng_check.py と同じ）', () => {
  it('辞書の語そのものは弾かれ、ありふれた名前は通る', () => {
    expect(ng.length).toBeGreaterThan(150)
    for (const w of ng) expect(ngHits(w.word), w.word).not.toEqual([])
    for (const ok of ['うちの子', 'もちこ', 'カマンベール', 'Mocha']) expect(ngHits(ok)).toEqual([])
  })

  it('部分一致・完全一致の使い分け（2文字以下は完全一致・印 * は部分一致）', () => {
    const partial = ng.find((w) => w.match === 'partial' && w.n.length >= 3)!
    expect(ngHits(`あいう${partial.word}えお`)).toContain(partial.word)
    const exact = ng.find((w) => w.match === 'exact')!
    expect(ngHits(`${exact.word}${exact.word}`)).not.toContain(exact.word)
  })
})

describe('セリフ lines.json', () => {
  const lines = linesFile.lines

  it('1本＝{ id, text, types, stages, times, states, scenes }。id は重ならず、タグの値は決まった中から', () => {
    expect(new Set(lines.map((l) => l.id)).size).toBe(lines.length)
    const ok = <T>(tag: T[] | 'all', vals: readonly T[]) => tag === 'all' || (tag.length > 0 && tag.every((v) => vals.includes(v)))
    for (const l of lines) {
      expect(Object.keys(l).sort()).toEqual(['id', 'scenes', 'stages', 'states', 'text', 'times', 'types'])
      expect(l.text.length).toBeGreaterThan(0)
      expect(ok(l.types, TYPES), l.id).toBe(true)
      expect(ok(l.stages, STAGES), l.id).toBe(true)
      expect(ok(l.times, LINE_TIMES), l.id).toBe(true)
      expect(ok(l.states, LINE_STATES), l.id).toBe(true)
      expect(ok(l.scenes, LINE_SCENES), l.id).toBe(true)
    }
  })

  it('初版：各タイプの口癖3本・失敗種3本・工房の1本（相棒v2 §8）と決まり文句', () => {
    for (const t of TYPES.filter((x) => x !== 'orig')) {
      const own = lines.filter((l) => l.types !== 'all' && l.types.includes(t) && l.stages === 'all')
      expect(own.length, t).toBeGreaterThanOrEqual(3)
    }
    expect(lines.filter((l) => l.types !== 'all' && l.types.includes('orig')).length).toBeGreaterThanOrEqual(1)
    const all = [...lines.map((l) => l.text), ...Object.values(linesFile.reactions)]
    for (const s of ['…べつに待ってないし', 'まだ眠くないよ', 'おなかいっぱい', '今日はいっぱいおしゃべりしたね', 'ちょっと暑い…', '…ん、おはよ'])
      expect(all, s).toContain(s)
  })

  it(`全タイプ×全段階×全時間帯×全状態×全場面（${TYPES.length}×${STAGES.length}×${LINE_TIMES.length}×${LINE_STATES.length}×${LINE_SCENES.length}）で必ず1本は出る`, () => {
    let n = 0
    const missing: string[] = []
    for (const type of TYPES)
      for (const stage of STAGES)
        for (const time of LINE_TIMES)
          for (const state of LINE_STATES)
            for (const scene of LINE_SCENES) {
              const q: LineQuery = { type, inferredType: type === 'orig' ? 'chevre' : undefined, stage, time, state, scene }
              n++
              if (!pickLine(q, null, () => 0.5)) missing.push(`${type}/${stage}/${time}/${state}/${scene}`)
            }
    expect(missing).toEqual([])
    expect(n).toBe(10 * 4 * 3 * 5 * 8)
  })

  it('すねている間は「…べつに待ってないし」系だけ（ふつうの行は出ない）', () => {
    for (const scene of LINE_SCENES) {
      const m = matchingLines({ type: 'fresh', stage: 'young', time: 'day', state: 'sulking', scene })
      expect(m.map((l) => l.text)).toEqual(['…べつに待ってないし'])
    }
  })

  it('工房オリジナルは orig の行と推定タイプの行の両方から引く', () => {
    const q: LineQuery = { type: 'orig', inferredType: 'chevre', stage: 'young', time: 'day', state: 'normal', scene: 'talk' }
    const texts = matchingLines(q).map((l) => l.text)
    expect(texts).toContain('ぼくって何チーズなんだろう')
    expect(texts).toContain('炭のおけしょう、似合う？')
  })

  it('同じ行が続かない（合う行が2本以上のとき）', () => {
    const q: LineQuery = { type: 'white_mold', stage: 'young', time: 'day', state: 'normal', scene: 'talk' }
    expect(matchingLines(q).length).toBeGreaterThan(1)
    let last: string | null = null
    let seed = 1
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 300; i++) {
      const l: { id: string } = pickLine(q, last, rng)!
      expect(l.id).not.toBe(last)
      last = l.id
    }
    // 1本しか合わなければ、その1本（続いてもよい）
    const one: LineQuery = { type: 'fresh', stage: 'young', time: 'day', state: 'sulking', scene: 'pet' }
    expect(pickLine(one, 'sulk-1', rng)?.id).toBe('sulk-1')
  })

  it('時間帯：朝4〜10時・昼10〜18時・夜18〜4時', () => {
    const t = (h: number, m = 0) => timeOfDay(new Date(2026, 10, 2, h, m).getTime())
    expect([t(3, 59), t(4), t(9, 59), t(10), t(17, 59), t(18), t(0)]).toEqual(['night', 'morning', 'morning', 'day', 'day', 'night', 'night'])
  })

  it('NG語：全行と反応の一言が ng_words.json に当たらない', () => {
    const texts = [...lines.map((l) => [l.id, l.text]), ...Object.entries(linesFile.reactions)]
    const hits = texts.map(([id, t]) => [id, ngHits(t)] as const).filter(([, h]) => h.length > 0)
    expect(hits).toEqual([])
  })

  it('名前の NG（「チーズくん」「Qちゃん」）を使わない', () => {
    for (const t of [...lines.map((l) => l.text), ...Object.values(linesFile.reactions)]) {
      expect(t).not.toMatch(/チーズくん|Qちゃん/)
    }
  })
})
