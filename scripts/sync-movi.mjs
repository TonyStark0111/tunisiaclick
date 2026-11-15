// Copies Movi Player's WebAssembly engine (movi.wasm) from node_modules into public/movi/ so the
// site serves it itself (same origin, cacheable, no third-party CDN). Runs on postinstall and
// before dev/build; harmless if movi-player isn't installed yet.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const from = join(root, 'node_modules', 'movi-player', 'dist', 'movi.wasm')
const to = join(root, 'public', 'movi', 'movi.wasm')

if (!existsSync(from)) {
  console.warn('[movi] node_modules/movi-player/dist/movi.wasm not found - run `npm install` first.')
  process.exit(0)
}
mkdirSync(dirname(to), { recursive: true })
copyFileSync(from, to)
console.log('[movi] movi.wasm -> public/movi/movi.wasm')
