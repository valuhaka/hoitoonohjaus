import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

// Transformers.js loads ONNX Runtime's wasm from its CDN at runtime. The copy bundled from
// onnxruntime-web is never used and is over Cloudflare's 25 MiB limit for a single asset.
const dropOnnxRuntimeWasm = (): Plugin => ({
  name: 'drop-onnxruntime-wasm',
  generateBundle(_, bundle) {
    for (const name of Object.keys(bundle)) if (/ort-wasm[^/]*\.wasm$/.test(name)) delete bundle[name]
  },
})

export default defineConfig({
  plugins: [react(), cloudflare()],
  worker: { plugins: () => [dropOnnxRuntimeWasm()] },
})
