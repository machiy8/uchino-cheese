// Web版の保存場所：IndexedDB（idb-keyval）。ネイティブ（Capacitor Preferences）は W5 で同じ形の SaveBackend を足す
import { createStore, del, get, set, type UseStore } from 'idb-keyval'
import type { SaveBackend } from './store'

export class IdbBackend implements SaveBackend {
  private readonly store: UseStore

  constructor(dbName = 'uchino-cheese', storeName = 'save') {
    this.store = createStore(dbName, storeName)
  }

  async get(key: string): Promise<string | undefined> {
    const v = await get<unknown>(key, this.store)
    return typeof v === 'string' ? v : undefined
  }

  set(key: string, value: string): Promise<void> {
    return set(key, value, this.store)
  }

  del(key: string): Promise<void> {
    return del(key, this.store)
  }
}
