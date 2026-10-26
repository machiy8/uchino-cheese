// どの版かを画面に出すための値。vite.config.ts の define がビルド時に入れる
// （Vercel のビルドは VERCEL_GIT_COMMIT_SHA の先頭7文字、無ければ "local"。日時は日本時間の文字列）
declare const __APP_COMMIT__: string
declare const __APP_BUILT_AT__: string

export const buildInfo = {
  commit: __APP_COMMIT__,
  builtAt: __APP_BUILT_AT__,
}
