import type { WebWorkerMLCEngine } from '@mlc-ai/web-llm'
import type { Complete } from './semantic'

// 4-bit WebLLM builds under 2 GB to download. Qwen3.5 2B is the default because it is trained on the
// widest set of languages; the Gemma builds are kept for the side-by-side comparison (#vertailu).
export const MODELS = [
  { id: 'Qwen3.5-2B-q4f16_1-MLC', name: 'Qwen3.5 2B', downloadGB: 1.08 },
  { id: 'gemma-2-2b-it-q4f16_1-MLC', name: 'Gemma 2 2B', downloadGB: 1.49 },
  { id: 'gemma3-1b-it-q4f16_1-MLC', name: 'Gemma 3 1B', downloadGB: 0.6 },
] as const
export type ModelId = (typeof MODELS)[number]['id']
export const DEFAULT_MODEL: ModelId = MODELS[0].id
export const modelName = (id: ModelId) => MODELS.find(m => m.id === id)!.name

export const hasWebGPU = () => typeof navigator !== 'undefined' && 'gpu' in navigator

export type EngineStatus =
  | { state: 'idle' }
  | { state: 'loading'; model: ModelId; progress: number; text: string }
  | { state: 'ready'; model: ModelId }
  | { state: 'error'; model: ModelId; message: string }

let status: EngineStatus = { state: 'idle' }
const listeners = new Set<() => void>()
const setStatus = (next: EngineStatus) => {
  status = next
  listeners.forEach(listener => listener())
}

// For useSyncExternalStore
export const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export const getStatus = () => status

// One engine for the whole app; switching models reloads it. Calls are chained so a reload
// never runs in the middle of a completion.
let engine: Promise<WebWorkerMLCEngine> | null = null
let current: ModelId | null = null
let queue: Promise<unknown> = Promise.resolve()

const progress = (model: ModelId) => ({ progress, text }: { progress: number; text: string }) =>
  setStatus({ state: 'loading', model, progress, text })

export const loadModel = (model: ModelId = DEFAULT_MODEL): Promise<WebWorkerMLCEngine> => {
  if (engine && current === model) return engine
  if (!hasWebGPU()) {
    setStatus({ state: 'error', model, message: 'WebGPU is not available in this browser' })
    return Promise.reject(new Error('WebGPU is not available in this browser'))
  }
  setStatus({ state: 'loading', model, progress: 0, text: '' })
  const previous = engine
  current = model
  const next: Promise<WebWorkerMLCEngine> = previous
    ? previous.then(async e => {
        e.setInitProgressCallback(progress(model))
        await e.reload(model)
        return e
      })
    // Imported on first use so the library stays out of the main bundle
    : import('@mlc-ai/web-llm').then(({ CreateWebWorkerMLCEngine }) =>
        CreateWebWorkerMLCEngine(
          new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
          model,
          { initProgressCallback: progress(model) },
        ))
  engine = next
  next.then(
    () => { if (engine === next) setStatus({ state: 'ready', model }) },
    (error: unknown) => {
      if (engine !== next) return
      engine = null
      current = null
      setStatus({ state: 'error', model, message: error instanceof Error ? error.message : String(error) })
    },
  )
  return next
}

// Deterministic JSON answers constrained by the schema; Qwen's thinking mode is switched off for speed
export const completeWith = (model: ModelId): Complete => (prompt, schema) => {
  const run = queue.then(async () => {
    const e = await loadModel(model)
    const reply = await e.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 512,
      response_format: { type: 'json_object', schema: JSON.stringify(schema) },
      ...(model.startsWith('Qwen') && { extra_body: { enable_thinking: false } }),
    })
    await e.resetChat()
    return reply.choices[0]?.message.content ?? ''
  })
  queue = run.catch(() => undefined)
  return run
}
