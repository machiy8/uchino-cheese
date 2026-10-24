import type { CapacitorConfig } from '@capacitor/cli'

// appId は Play に一度出すと変えられない。仮の値（PR で確認中）
const config: CapacitorConfig = {
  appId: 'jp.uchinocheese.app',
  appName: 'うちのチーズ',
  webDir: 'dist',
}

export default config
