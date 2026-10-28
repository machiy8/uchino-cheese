// 保存（実装計画 §2-1・§5「保存の移し替え」のうち W2 の分）：A・B 交互書き、壊れた方を使わない、新しい版は上書きしない
import { afterEach, describe, expect, it, vi } from 'vitest'
import { addCare, startAging } from '../src/game/cellar'
import { newGameState, type GameState } from '../src/game/state'
import { AutoSaver, SAVE_DEBOUNCE_MS } from '../src/save/autosave'
import { MemoryBackend } from '../src/save/memory'
import { SaveStore } from '../src/save/store'

const T0 = new Date(2026, 10, 2, 12, 0).getTime()

function sampleState(): GameState {
  let s = newGameState(T0, '0.1.0')
  s = { ...s, buddy: { affection: 320 }, zukan: { registered: { r01: { firstAt: '2026-11-02', count: 2 }, f66: { firstAt: '2026-11-02', count: 1 } } } }
  s = startAging(s, { milk: '山羊', bac: '白カビ', press: 1, room: 'しっとり', knead: false }, T0)
  s = addCare(addCare(s, 1, '返す'), 1, '塩')
  return s
}

const docIn = (b: MemoryBackend, k: 'save:A' | 'save:B') => JSON.parse(b.data.get(k)!) as GameState

describe('SaveStore', () => {
  it('空の保存：どちらにも無ければ empty', async () => {
    const st = new SaveStore(new MemoryBackend(), '0.1.0')
    expect(await st.load()).toEqual({ kind: 'empty' })
  })

  it('書いて読むと同じ（meta.saveSeq・lastSavedAt・appVersion だけ書いたときの値になる）', async () => {
    const b = new MemoryBackend()
    const s = sampleState()
    const r = await new SaveStore(b, '0.1.0').save(s, T0 + 60_000)
    expect(r).toEqual({ saveSeq: 1, lastSavedAt: new Date(T0 + 60_000).toISOString() })
    const got = await new SaveStore(b, '0.1.0').load()
    expect(got.kind).toBe('ok')
    if (got.kind !== 'ok') return
    expect(got.state).toEqual({ ...s, meta: { appVersion: '0.1.0', saveSeq: 1 }, lastSavedAt: r!.lastSavedAt })
    expect(got.state.aging[0].careLast).toBe('塩')
    expect(got.from).toBe('save:A')
  })

  it('A・B に交互に書き、saveSeq は1ずつ増える', async () => {
    const b = new MemoryBackend()
    const st = new SaveStore(b, '0.1.0')
    const s = sampleState()
    await st.save(s, T0)
    await st.save(s, T0)
    await st.save(s, T0)
    expect(docIn(b, 'save:A').meta.saveSeq).toBe(3)
    expect(docIn(b, 'save:B').meta.saveSeq).toBe(2)
    // 読み直してから書いても、古い方（B）に書く
    const st2 = new SaveStore(b, '0.1.0')
    await st2.load()
    await st2.save(s, T0)
    expect(docIn(b, 'save:B').meta.saveSeq).toBe(4)
  })

  it('同時に頼まれた保存も順番に書く（saveSeq が重ならない）', async () => {
    const b = new MemoryBackend()
    const st = new SaveStore(b, '0.1.0')
    const rs = await Promise.all([st.save(sampleState(), T0), st.save(sampleState(), T0)])
    expect(rs.map((r) => r!.saveSeq)).toEqual([1, 2])
  })

  it('A が壊れていたら B（新しい方が壊れていても、壊れていない古い方を使う）', async () => {
    const b = new MemoryBackend()
    const st = new SaveStore(b, '0.1.0')
    const s = sampleState()
    await st.save(s, T0) // A: 1
    await st.save({ ...s, buddy: { affection: 999 } }, T0) // B: 2
    await st.save(s, T0) // A: 3
    b.data.set('save:A', b.data.get('save:A')!.slice(0, 40)) // 書きかけで切れた
    const got = await new SaveStore(b, '0.1.0').load()
    expect(got).toMatchObject({ kind: 'ok', from: 'save:B', otherBroken: true })
    if (got.kind === 'ok') expect(got.state.buddy.affection).toBe(999)
  })

  it.each([
    ['JSON でない', 'not json'],
    ['形が違う（aging が配列でない）', (d: GameState) => JSON.stringify({ ...d, aging: {} })],
    ['careLast が手入れの値でない', (d: GameState) => JSON.stringify({ ...d, aging: [{ ...d.aging[0], careLast: 'wash' }] })],
    ['saveSeq が無い', (d: GameState) => JSON.stringify({ ...d, meta: { appVersion: 'x' } })],
  ] as const)('壊れている扱い：%s', async (_n, broken) => {
    const b = new MemoryBackend()
    const st = new SaveStore(b, '0.1.0')
    await st.save(sampleState(), T0) // A: 1
    await st.save(sampleState(), T0) // B: 2
    const d = docIn(b, 'save:B')
    b.data.set('save:B', typeof broken === 'string' ? broken : broken(d))
    expect(await new SaveStore(b, '0.1.0').load()).toMatchObject({ kind: 'ok', from: 'save:A', otherBroken: true })
  })

  it('両方壊れていたら新規（corrupt）。次の保存は A から', async () => {
    const b = new MemoryBackend()
    b.data.set('save:A', '{')
    b.data.set('save:B', '[]')
    const st = new SaveStore(b, '0.1.0')
    expect(await st.load()).toEqual({ kind: 'corrupt' })
    expect(await st.save(newGameState(T0, '0.1.0'), T0)).toMatchObject({ saveSeq: 1 })
    expect(docIn(b, 'save:A').meta.saveSeq).toBe(1)
  })

  it('片方だけ古ければ新しい方', async () => {
    const b = new MemoryBackend()
    const st = new SaveStore(b, '0.1.0')
    const s = sampleState()
    await st.save({ ...s, buddy: { affection: 1 } }, T0) // A: 1
    await st.save({ ...s, buddy: { affection: 2 } }, T0) // B: 2
    const got = await new SaveStore(b, '0.1.0').load()
    expect(got).toMatchObject({ kind: 'ok', from: 'save:B', otherBroken: false })
    if (got.kind === 'ok') expect(got.state.buddy.affection).toBe(2)
  })

  it('自分より新しい schemaVersion の文書は上書きしない（読み取り専用）', async () => {
    const b = new MemoryBackend()
    const st = new SaveStore(b, '0.1.0')
    await st.save(sampleState(), T0) // A: 1（schemaVersion 2）
    const newer = { ...docIn(b, 'save:A'), schemaVersion: 3, meta: { appVersion: '9.0.0', saveSeq: 7 }, extra: { w9: true } }
    b.data.set('save:B', JSON.stringify(newer))
    const before = new Map(b.data)
    const st2 = new SaveStore(b, '0.1.0')
    const got = await st2.load()
    expect(got.kind).toBe('newer')
    if (got.kind === 'newer') {
      expect(got.schemaVersion).toBe(3)
      // この版で分かる項目は見せられる
      expect(got.state?.zukan.registered.r01.count).toBe(2)
    }
    expect(st2.isReadOnly).toBe(true)
    expect(await st2.save(sampleState(), T0)).toBeNull()
    expect(await st2.clear()).toBe(false)
    expect(b.data).toEqual(before)
  })

  it('新しい版の文書が古い saveSeq なら、この版の新しい方を使う', async () => {
    const b = new MemoryBackend()
    const st = new SaveStore(b, '0.1.0')
    await st.save(sampleState(), T0)
    await st.save(sampleState(), T0)
    b.data.set('save:A', JSON.stringify({ schemaVersion: 3, meta: { appVersion: '9', saveSeq: 1 } }))
    expect(await new SaveStore(b, '0.1.0').load()).toMatchObject({ kind: 'ok', from: 'save:B' })
  })

  it('セーブを消すと両方なくなり、次は saveSeq 1 から', async () => {
    const b = new MemoryBackend()
    const st = new SaveStore(b, '0.1.0')
    await st.save(sampleState(), T0)
    await st.save(sampleState(), T0)
    expect(await st.clear()).toBe(true)
    expect(b.data.size).toBe(0)
    expect(await st.save(sampleState(), T0)).toMatchObject({ saveSeq: 1 })
  })
})

describe('AutoSaver（デバウンス1秒・裏に回ったらすぐ）', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('操作が続く間は待ち、最後の操作から1秒で1回だけ保存する', () => {
    vi.useFakeTimers()
    const write = vi.fn(async () => {})
    const a = new AutoSaver(write)
    a.schedule()
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS - 1)
    a.schedule()
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS - 1)
    expect(write).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(write).toHaveBeenCalledTimes(1)
    expect(a.pending).toBe(false)
  })

  it('画面が裏に回ったら（visibilitychange → hidden）待たずに保存する', () => {
    vi.useFakeTimers()
    const write = vi.fn(async () => {})
    const a = new AutoSaver(write)
    const listeners: Record<string, () => void> = {}
    const doc = {
      visibilityState: 'visible',
      addEventListener: (k: string, f: () => void) => (listeners[k] = f),
      removeEventListener: () => {},
      defaultView: null,
    } as unknown as Document
    a.watchVisibility(doc)
    a.schedule()
    listeners.visibilitychange()
    expect(write).not.toHaveBeenCalled()
    ;(doc as { visibilityState: string }).visibilityState = 'hidden'
    listeners.visibilitychange()
    expect(write).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS * 2)
    expect(write).toHaveBeenCalledTimes(1)
  })
})
