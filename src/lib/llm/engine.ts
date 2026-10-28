import type { CompletionUsage, WebWorkerMLCEngine } from '@mlc-ai/web-llm'
import { debug, type Usage } from '../debug'
import type { Complete } from './semantic'
import type { TransformersReply, TransformersRequest } from './transformers-worker'

// 4-bit browser builds. Qwen3.5 2B is the default because it is trained on the widest set of languages;
// the others are kept for the side-by-side comparison (#vertailu). WebLLM has no Gemma 4 build, so
// Gemma 4 runs on Transformers.js from the ONNX export, downloading only its text parts.
export const MODELS = [
  { id: 'Qwen3.5-2B-q4f16_1-MLC', name: 'Qwen3.5 2B', downloadGB: 1.08, runtime: 'webllm' },
  { id: 'onnx-community/gemma-4-E2B-it-ONNX', name: 'Gemma 4 E2B', downloadGB: 2.97, runtime: 'transformers' },
  { id: 'gemma-2-2b-it-q4f16_1-MLC', name: 'Gemma 2 2B', downloadGB: 1.49, runtime: 'webllm' },
  { id: 'gemma3-1b-it-q4f16_1-MLC', name: 'Gemma 3 1B', downloadGB: 0.6, runtime: 'webllm' },
] as const
export type ModelId = (typeof MODELS)[number]['id']
export const DEFAULT_MODEL: ModelId = MODELS[0].id
export const modelName = (id: ModelId) => MODELS.find(m => m.id === id)!.name
export const runtimeOf = (id: ModelId) => MODELS.find(m => m.id === id)!.runtime

export const hasWebGPU = () => typeof navigator !== 'undefined' && 'gpu' in navigator

// The model patient searches use. The debug panel switches it; the choice is kept per browser.
const ACTIVE_KEY = 'psyykkeri.model'
const isModelId = (id: string | null): id is ModelId => MODELS.some(m => m.id === id)
let active: ModelId = (() => {
  try {
    const saved = localStorage.getItem(ACTIVE_KEY)
    return isModelId(saved) ? saved : DEFAULT_MODEL
  } catch {
    return DEFAULT_MODEL
  }
})()
const activeListeners = new Set<() => void>()
export const getActiveModel = () => active
export const setActiveModel = (id: ModelId) => {
  active = id
  try { localStorage.setItem(ACTIVE_KEY, id) } catch { /* private mode */ }
  activeListeners.forEach(listener => listener())
}
// For useSyncExternalStore
export const subscribeActiveModel = (listener: () => void) => {
  activeListeners.add(listener)
  return () => activeListeners.delete(listener)
}

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

type Progress = (report: { progress: number; text: string }) => void
const progress = (model: ModelId): Progress => ({ progress, text }) =>
  setStatus({ state: 'loading', model, progress, text })

// What the model answered, plus what the debug panel shows about the call
type Reply = { text: string; sent: string; raw: string; options: Record<string, unknown>; usage?: Usage }

// Called as tokens arrive, so the debug panel can tell a slow generation from a stuck one
type OnPartial = (text: string, tokens: number) => void

// A loaded model. Only one is kept in GPU memory at a time.
type Backend = {
  complete: (prompt: string, schema: object, onPartial: OnPartial) => Promise<Reply>
  unload: () => Promise<void>
  info: Record<string, unknown>
}

const MAX_TOKENS = 512

// The WebLLM worker is kept between models and reloaded in place
let webllm: Promise<WebWorkerMLCEngine> | null = null

const webllmBackend = async (model: ModelId, onProgress: Progress): Promise<Backend> => {
  if (webllm) {
    const e = await webllm
    e.setInitProgressCallback(onProgress)
    await e.reload(model)
  } else {
    // Imported on first use so the library stays out of the main bundle
    webllm = import('@mlc-ai/web-llm').then(({ CreateWebWorkerMLCEngine }) =>
      CreateWebWorkerMLCEngine(
        new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
        model,
        { initProgressCallback: onProgress },
      ))
    webllm.catch(() => { webllm = null })
  }
  const e = await webllm
  const { prebuiltAppConfig } = await import('@mlc-ai/web-llm')
  const record = prebuiltAppConfig.model_list.find(m => m.model_id === model)
  return {
    // Deterministic JSON answers constrained by the schema; Qwen's thinking mode is switched off for speed
    complete: async (prompt, schema, onPartial) => {
      const options = {
        temperature: 0,
        max_tokens: MAX_TOKENS,
        response_format: { type: 'json_object' as const, schema: JSON.stringify(schema) },
        ...(model.startsWith('Qwen') && { extra_body: { enable_thinking: false } }),
      }
      const chunks = await e.chat.completions.create({
        messages: [{ role: 'user', content: prompt }], ...options, stream: true, stream_options: { include_usage: true },
      })
      let text = ''
      let tokens = 0
      let finishReason: string | null | undefined
      let usage: CompletionUsage | undefined
      for await (const chunk of chunks) {
        const choice = chunk.choices[0]
        if (choice?.delta.content) {
          text += choice.delta.content
          tokens++
          onPartial(text, tokens)
        }
        finishReason = choice?.finish_reason ?? finishReason
        usage = chunk.usage ?? usage
      }
      await e.resetChat()
      return {
        text, raw: text, sent: prompt, options: { ...options, stream: true, finishReason },
        ...(usage && {
          usage: {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            timeToFirstToken: usage.extra?.time_to_first_token_s,
            prefillTokensPerS: usage.extra?.prefill_tokens_per_s,
            decodeTokensPerS: usage.extra?.decode_tokens_per_s,
          },
        }),
      }
    },
    unload: () => e.unload(),
    // Only static config here: WebLLM's GPU queries open a second GPU device and can stall the load.
    // The debug panel reads the adapter itself.
    info: {
      modelUrl: record?.model,
      modelLib: record?.model_lib,
      vramRequiredMB: record?.vram_required_MB,
      lowResourceRequired: record?.low_resource_required,
      overrides: record?.overrides,
    },
  }
}

// Transformers.js cannot constrain decoding to a schema, so the schema goes into the prompt and the
// JSON object is cut out of the answer (models like to wrap it in a code fence)
const withSchema = (prompt: string, schema: object) =>
  `${prompt}\n\nAnswer with one JSON object that follows this JSON schema:\n${JSON.stringify(schema)}`
const jsonObject = (text: string) => {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  return start >= 0 && end > start ? text.slice(start, end + 1) : text
}

// Each Transformers.js model gets its own worker; ending the worker frees its GPU memory
const transformersBackend = (model: ModelId, onProgress: Progress) => new Promise<Backend>((resolve, reject) => {
  const options = { dtype: 'q4f16', device: 'webgpu', max_new_tokens: MAX_TOKENS, do_sample: false }
  const worker = new Worker(new URL('./transformers-worker.ts', import.meta.url), { type: 'module' })
  const send = (request: TransformersRequest) => worker.postMessage(request)
  const pending = new Map<number, {
    sent: string
    onPartial: OnPartial
    resolve: (reply: Reply) => void
    reject: (error: Error) => void
  }>()
  let nextId = 0
  const settle = (id: number) => {
    const call = pending.get(id)!
    pending.delete(id)
    return call
  }

  const backend: Backend = {
    complete: (prompt, schema, onPartial) => new Promise<Reply>((resolve, reject) => {
      const id = nextId++
      const sent = withSchema(prompt, schema)
      pending.set(id, { sent, onPartial, resolve, reject })
      send({ type: 'complete', id, prompt: sent, maxTokens: MAX_TOKENS })
    }),
    unload: async () => {
      worker.terminate()
      pending.forEach(call => call.reject(new Error('Model was unloaded')))
      pending.clear()
    },
    info: {},
  }

  worker.onmessage = ({ data }: MessageEvent<TransformersReply>) => {
    if (data.type === 'progress') onProgress(data)
    else if (data.type === 'partial') pending.get(data.id)?.onPartial(data.text, data.tokens)
    else if (data.type === 'ready') resolve({ ...backend, info: data.info })
    else if (data.type === 'loadFailed') {
      worker.terminate()
      reject(new Error(data.message))
    }
    else if (data.type === 'result') {
      const call = settle(data.id)
      call.resolve({ text: jsonObject(data.text), raw: data.text, sent: call.sent, options, usage: data.usage })
    }
    else settle(data.id).reject(new Error(data.message))
  }
  worker.onerror = event => {
    worker.terminate()
    reject(new Error(event.message))
  }
  send({ type: 'load', model })
})

// One model for the whole app; switching models unloads the previous one first. Calls are chained
// so a reload never runs in the middle of a completion.
let backend: Promise<Backend> | null = null
let current: ModelId | null = null
let queue: Promise<unknown> = Promise.resolve()

export const loadModel = (model: ModelId = DEFAULT_MODEL): Promise<Backend> => {
  if (backend && current === model) return backend
  if (!hasWebGPU()) {
    setStatus({ state: 'error', model, message: 'WebGPU is not available in this browser' })
    return Promise.reject(new Error('WebGPU is not available in this browser'))
  }
  setStatus({ state: 'loading', model, progress: 0, text: '' })
  const runtime = runtimeOf(model)
  const start = runtime === 'webllm' ? webllmBackend : transformersBackend
  const previous = backend
  const previousModel = current
  current = model
  const next = Promise.resolve(previous)
    .then(async b => {
      if (!b) return
      await b.unload()
      debug.engine({ model: previousModel!, runtime: runtimeOf(previousModel!), event: 'unload' })
    }, () => undefined)
    .then(() => {
      debug.engine({ model, runtime, event: 'load' })
      const started = performance.now()
      return start(model, progress(model)).then(b => ({ b, ms: performance.now() - started }))
    })
    .then(({ b, ms }) => {
      debug.engine({ model, runtime, event: 'ready', ms, info: b.info })
      return b
    })
  backend = next
  next.then(
    () => { if (backend === next) setStatus({ state: 'ready', model }) },
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      debug.engine({ model, runtime, event: 'error', message })
      if (backend !== next) return
      backend = null
      current = null
      setStatus({ state: 'error', model, message })
    },
  )
  return next
}

export const completeWith = (model: ModelId): Complete => (prompt, schema) => {
  const id = debug.call({ model, runtime: runtimeOf(model), prompt, schema })
  const run = queue.then(async () => {
    const waiting = performance.now()
    try {
      const b = await loadModel(model)
      debug.updateCall(id, { startedAt: Date.now(), loadMs: performance.now() - waiting })
      // Streamed text reaches the debug panel at most every 100 ms
      let shown = 0
      const onPartial: OnPartial = (partial, tokens) => {
        const now = Date.now()
        if (tokens === 1) debug.updateCall(id, { firstTokenAt: now })
        if (now - shown < 100) return
        shown = now
        debug.updateCall(id, { partial, streamedTokens: tokens })
      }
      const { text, ...reply } = await b.complete(prompt, schema, onPartial)
      debug.updateCall(id, { ...reply, output: text, finishedAt: Date.now() })
      return text
    } catch (error) {
      debug.updateCall(id, { error: error instanceof Error ? error.message : String(error), finishedAt: Date.now() })
      throw error
    }
  })
  queue = run.catch(() => undefined)
  return run
}
