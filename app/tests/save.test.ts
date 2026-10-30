// 保存（実装計画 §2-1・§5「保存の移し替え」のうち W2 の分）：A・B 交互書き、壊れた方を使わない、新しい版は上書きしない
import { afterEach, describe, expect, it, vi } from 'vitest'
import { birth, buddyOp } from '../src/game/buddy'
import { addCare, decideCare, startAging } from '../src/game/cellar'
import { emptyBuddy, newGameState, type GameState } from '../src/game/state'
import { AutoSaver, SAVE_DEBOUNCE_MS } from '../src/save/autosave'
import { MemoryBackend } from '../src/save/memory'
import { SaveStore } from '../src/save/store'

const T0 = new Date(2026, 10, 2, 12, 0).getTime()

function sampleState(): GameState {
  let s = newGameState(T0, '0.1.0')
  s = { ...s, buddy: { ...s.buddy, affection: 320 }, zukan: { registered: { r01: { firstAt: '2026-11-02', count: 2 }, f66: { firstAt: '2026-11-02', count: 1 } } } }
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
    expect(got.state.aging[0].careSeq).toEqual({ 洗う: 0, 返す: 1, 針: 0, 塩: 2 })
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
    await st.save({ ...s, buddy: { ...s.buddy, affection: 999 } }, T0) // B: 2
    await st.save(s, T0) // A: 3
    b.data.set('save:A', b.data.get('save:A')!.slice(0, 40)) // 書きかけで切れた
    const got = await new SaveStore(b, '0.1.0').load()
    expect(got).toMatchObject({ kind: 'ok', from: 'save:B', otherBroken: true })
    if (got.kind === 'ok') expect(got.state.buddy.affection).toBe(999)
  })

  it.each([
    ['JSON でない', 'not json'],
    ['形が違う（aging が配列でない）', (d: GameState) => JSON.stringify({ ...d, aging: {} })],
    ['careSeq が整数でない', (d: GameState) => JSON.stringify({ ...d, aging: [{ ...d.aging[0], careSeq: { ...d.aging[0].careSeq, 洗う: 'x' } }] })],
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
    await st.save({ ...s, buddy: { ...s.buddy, affection: 1 } }, T0) // A: 1
    await st.save({ ...s, buddy: { ...s.buddy, affection: 2 } }, T0) // B: 2
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
    const write = vi.fn(async () => true)
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
    const write = vi.fn(async () => true)
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

describe('セーブの形の確認（壊れた側として扱う）', () => {
  const T = new Date(2026, 10, 2, 12, 0).getTime()
  async function loadWithB(mut: (d: Record<string, unknown>) => unknown) {
    const b = new MemoryBackend()
    const st = new SaveStore(b, '0.1.0')
    const s = birth(sampleState(), 'r07', T)
    await st.save(s, T) // A: 1
    await st.save(s, T) // B: 2
    const d = docIn(b, 'save:B') as unknown as Record<string, unknown>
    b.data.set('save:B', JSON.stringify(mut(structuredClone(d))))
    return new SaveStore(b, '0.1.0').load()
  }
  const slot0 = (d: Record<string, unknown>) => (d.aging as Record<string, unknown>[])[0]
  const buddy = (d: Record<string, unknown>) => d.buddy as Record<string, unknown>

  it.each([
    ['startedAt が日付として読めない', (d: Record<string, unknown>) => ((slot0(d).startedAt = '2026-13-40'), d)],
    ['slot が 1〜AGING_SLOTS の外（4）', (d: Record<string, unknown>) => ((slot0(d).slot = 4), d)],
    ['slot が 0', (d: Record<string, unknown>) => ((slot0(d).slot = 0), d)],
    ['入力が domains の値でない（cow）', (d: Record<string, unknown>) => (((slot0(d).input as Record<string, unknown>).milk = 'cow'), d)],
    ['圧搾が domains の値でない（4）', (d: Record<string, unknown>) => (((slot0(d).input as Record<string, unknown>).press = 4), d)],
    ['createdAt が日付として読めない', (d: Record<string, unknown>) => ((d.createdAt = 'きのう'), d)],
    ['図鑑に無い種が登録されている', (d: Record<string, unknown>) => (((d.zukan as { registered: Record<string, unknown> }).registered.x99 = { firstAt: '2026-11-02', count: 1 }), d)],
    ['登録日が日付でない', (d: Record<string, unknown>) => (((d.zukan as { registered: Record<string, { firstAt: string }> }).registered.r01.firstAt = '11/2'), d)],
    ['相棒の種が図鑑に無い', (d: Record<string, unknown>) => ((buddy(d).speciesId = 'r99'), d)],
    ['機嫌が 0〜100 の外', (d: Record<string, unknown>) => ((buddy(d).mood = 101), d)],
    ['元気が下限10より下', (d: Record<string, unknown>) => ((buddy(d).energy = 9), d)],
    ['ワイルド度が 0〜3 の外', (d: Record<string, unknown>) => ((buddy(d).wild = 4), d)],
    ['なつきが負', (d: Record<string, unknown>) => ((buddy(d).affection = -1), d)],
    ['相棒がいるのに日数が0', (d: Record<string, unknown>) => ((buddy(d).daysTogether = 0), d)],
    ['最後の操作が日付として読めない', (d: Record<string, unknown>) => ((buddy(d).lastInteractionAt = 'x'), d)],
    ['寝ているのに寝た時刻が無い', (d: Record<string, unknown>) => ((buddy(d).sleep = { isSleeping: true, sleptAt: null }), d)],
    ['その日の回数が整数でない', (d: Record<string, unknown>) => (((buddy(d).daily as { counts: Record<string, unknown> }).counts.pet = 1.5), d)],
    ['ひらめきの場面が知らない値', (d: Record<string, unknown>) => (((buddy(d).daily as { hintsGiven: string[] }).hintsGiven = ['photo']), d)],
    ['ワイルドアルバムが範囲外', (d: Record<string, unknown>) => ((buddy(d).wildAlbum = [5]), d)],
  ] as const)('%s', async (_n, mut) => {
    expect(await loadWithB(mut)).toMatchObject({ kind: 'ok', from: 'save:A', otherBroken: true })
  })

  it('相棒の項目を足した文書を書いて読むと同じ', async () => {
    const b = new MemoryBackend()
    let s = birth(sampleState(), 'r07', T)
    s = buddyOp(s, { op: 'care', kind: 'wipe' }, T + 60_000).state
    s = buddyOp(s, { op: 'talk' }, T + 120_000).state
    const r = await new SaveStore(b, '0.1.0').save(s, T)
    const got = await new SaveStore(b, '0.1.0').load()
    expect(got.kind).toBe('ok')
    if (got.kind === 'ok') expect(got.state).toEqual({ ...s, meta: { appVersion: '0.1.0', saveSeq: 1 }, lastSavedAt: r!.lastSavedAt })
  })

  it('W2 で作った文書（buddy が affection だけ・枠に careLast）を読むと、足りない項目は初期値で埋まる', async () => {
    const b = new MemoryBackend()
    const w2 = {
      schemaVersion: 2,
      meta: { appVersion: '0.1.0', saveSeq: 5 },
      createdAt: '2026-11-01T03:00:00.000Z',
      lastSavedAt: '2026-11-02T03:00:00.000Z',
      buddy: { affection: 320 },
      zukan: { registered: { r01: { firstAt: '2026-11-01', count: 1 } } },
      aging: [
        {
          slot: 2,
          startedAt: '2026-11-02T01:00:00.000Z',
          input: { milk: '牛', bac: '白カビ', press: 1, room: 'しっとり', finish: null },
          careLog: { 洗う: 2, 返す: 2, 針: 0, 塩: 1, 練る: 0 },
          careLast: '返す',
          boostPct: 3,
        },
      ],
    }
    b.data.set('save:A', JSON.stringify(w2))
    const got = await new SaveStore(b, '0.1.0').load()
    expect(got.kind).toBe('ok')
    if (got.kind !== 'ok') return
    expect(got.state.buddy).toEqual({ ...emptyBuddy(Date.parse(w2.createdAt), 320) })
    expect(got.state.buddy).toMatchObject({ speciesId: null, mood: 70, energy: 80, affection: 320, wild: 0, wildAlbum: [] })
    // careLast の手入れが同数の中で最後（洗う2・返す2 → 返す）
    expect(got.state.aging[0].careSeq).toEqual({ 洗う: 0, 返す: 5, 針: 0, 塩: 0 })
    expect(got.state.aging[0]).not.toHaveProperty('careLast')
    expect(decideCare(got.state.aging[0])).toBe('返す')
  })
})

describe('読み込みの失敗（I/O）と壊れた中身を分ける', () => {
  class FailingBackend extends MemoryBackend {
    failGet = true
    failSet = false
    async get(key: string) {
      if (this.failGet) throw new Error('IndexedDB の読み込みに失敗')
      return super.get(key)
    }
    async set(key: string, value: string) {
      if (this.failSet) throw new Error('IndexedDB の書き込みに失敗')
      return super.set(key, value)
    }
  }

  it('読めなかったら error。保存も消去もしない（中身の分からない文書を新規で上書きしない）', async () => {
    const b = new FailingBackend()
    const ok = new SaveStore(b, '0.1.0')
    b.failGet = false
    await ok.save(sampleState(), T0)
    b.failGet = true
    const before = new Map(b.data)
    const st = new SaveStore(b, '0.1.0')
    expect(await st.load()).toEqual({ kind: 'error' })
    expect(st.isBlocked).toBe(true)
    expect(await st.save(newGameState(T0, '0.1.0'), T0)).toBeNull()
    expect(await st.clear()).toBe(false)
    expect(b.data).toEqual(before)
    // 読めるようになったら、もう一度読めば続きから
    b.failGet = false
    expect(await st.load()).toMatchObject({ kind: 'ok' })
    expect(st.isBlocked).toBe(false)
  })

  it('中身が壊れていた（JSON でない）は corrupt（新規で始めてよい）', async () => {
    const b = new MemoryBackend()
    b.data.set('save:A', '{{{')
    expect(await new SaveStore(b, '0.1.0').load()).toEqual({ kind: 'corrupt' })
  })

  it('保存に失敗したら未保存の印が残り、次の操作か裏に回るときに保存し直す', async () => {
    vi.useFakeTimers()
    let fail = true
    const write = vi.fn(async () => !fail)
    const a = new AutoSaver(write)
    a.schedule()
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS)
    expect(write).toHaveBeenCalledTimes(1)
    expect(a.dirty).toBe(true)
    // 裏に回る（flush）：待っている保存は無いが、未保存なので保存し直す
    fail = false
    expect(await a.flush()).toBe(true)
    expect(write).toHaveBeenCalledTimes(2)
    expect(a.dirty).toBe(false)
    // 未保存が無ければ flush は何もしない
    await a.flush()
    expect(write).toHaveBeenCalledTimes(2)
    // 例外で失敗しても印は残る
    const b2 = new AutoSaver(async () => {
      throw new Error('x')
    })
    b2.schedule()
    expect(await b2.flush()).toBe(false)
    expect(b2.dirty).toBe(true)
    vi.useRealTimers()
  })

  it('保存の途中で次の変更が来たら、その保存が成功しても未保存の印は消さない', async () => {
    let release: (v: boolean) => void = () => {}
    const a = new AutoSaver(() => new Promise<boolean>((r) => (release = r)))
    a.schedule()
    const p = a.flush()
    a.schedule() // 書いている間の変更
    release(true)
    await p
    expect(a.dirty).toBe(true)
    a.cancel()
  })
})

describe('セーブを消すのも保存と同じ列に並べる', () => {
  it('消す前に頼まれた保存は消す前に書き、消している最中に頼まれた保存は消した後に書く（消す前の状態に戻らない）', async () => {
    const b = new MemoryBackend()
    const order: string[] = []
    const slow = {
      get: (k: string) => b.get(k),
      set: async (k: string, v: string) => {
        await new Promise((r) => setTimeout(r, 5))
        order.push(`set ${JSON.parse(v).buddy.affection}`)
        return b.set(k, v)
      },
      del: async (k: string) => {
        await new Promise((r) => setTimeout(r, 5))
        order.push(`del ${k}`)
        return b.del(k)
      },
    }
    const st = new SaveStore(slow, '0.1.0')
    const s = sampleState()
    const p1 = st.save({ ...s, buddy: { ...s.buddy, affection: 1 } }, T0)
    const pc = st.clear()
    const fresh = newGameState(T0, '0.1.0')
    const p2 = st.save(fresh, T0)
    await Promise.all([p1, pc, p2])
    expect(order).toEqual(['set 1', 'del save:A', 'del save:B', 'set 0'])
    expect(await new SaveStore(b, '0.1.0').load()).toMatchObject({ kind: 'ok', state: { buddy: { affection: 0 }, meta: { saveSeq: 1 } } })
  })
})
