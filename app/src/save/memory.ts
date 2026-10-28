// テストと「保存できない環境」用の保存場所（メモリの中だけ）
import type { SaveBackend } from './store'

export class MemoryBackend implements SaveBackend {
  readonly data = new Map<string, string>()

  async get(key: string): Promise<string | undefined> {
    return this.data.get(key)
  }

  async set(key: string, value: string): Promise<void> {
    this.data.set(key, value)
  }

  async del(key: string): Promise<void> {
    this.data.delete(key)
  }
}
