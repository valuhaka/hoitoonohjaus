import { env, pipeline, TextStreamer, type ProgressInfo, type TextGenerationPipeline } from '@huggingface/transformers'
import type { Usage } from '../debug'

// Runs Transformers.js models off the main thread, like ./worker does for WebLLM.
// The text-generation pipeline loads only the text parts of multimodal models such as Gemma 4.
export type TransformersRequest =
  | { type: 'load'; model: string }
  | { type: 'complete'; id: number; prompt: string; maxTokens: number }
export type TransformersReply =
  | { type: 'progress'; progress: number; text: string }
  | { type: 'ready'; info: Record<string, unknown> }
  | { type: 'loadFailed'; message: string }
  | { type: 'partial'; id: number; text: string; tokens: number }
  | { type: 'result'; id: number; text: string; usage: Usage }
  | { type: 'failed'; id: number; message: string }

const DTYPE = 'q4f16'
const DEVICE = 'webgpu'

const post = (reply: TransformersReply) => self.postMessage(reply)
const message = (error: unknown) => (error instanceof Error ? error.message : String(error))
const megabytes = (bytes: number) => Math.round(bytes / 2 ** 20)

const onProgress = (info: ProgressInfo) => {
  if (info.status !== 'progress_total') return
  post({ type: 'progress', progress: info.progress / 100, text: `${megabytes(info.loaded)} / ${megabytes(info.total)} MB` })
}

// For the debug panel: versions, the ONNX sessions that were loaded and the main config values
const describe = (generate: TextGenerationPipeline): Record<string, unknown> => {
  const model = generate.model as unknown as { sessions?: Record<string, unknown>; config?: Record<string, unknown> }
  const config = model.config ?? {}
  const text = (config.text_config as Record<string, unknown> | undefined) ?? config
  const pick = (...keys: string[]) => Object.fromEntries(keys.filter(k => text[k] !== undefined).map(k => [k, text[k]]))
  return {
    transformersVersion: env.version,
    onnxRuntimeWeb: (env.backends.onnx as { versions?: Record<string, string> } | undefined)?.versions?.web,
    dtype: DTYPE,
    device: DEVICE,
    sessions: Object.keys(model.sessions ?? {}),
    modelType: config.model_type,
    architectures: config.architectures,
    ...pick('hidden_size', 'num_hidden_layers', 'num_attention_heads', 'num_key_value_heads', 'vocab_size',
      'max_position_embeddings', 'sliding_window'),
  }
}

let generator: Promise<TextGenerationPipeline> | null = null

self.onmessage = async ({ data }: MessageEvent<TransformersRequest>) => {
  if (data.type === 'load') {
    generator = pipeline('text-generation', data.model, { dtype: DTYPE, device: DEVICE, progress_callback: onProgress })
    generator.then(g => post({ type: 'ready', info: describe(g) }), error => post({ type: 'loadFailed', message: message(error) }))
    return
  }
  try {
    const generate = await generator!
    // The streamer sees the prompt tokens first, then one call per generated token
    let promptTokens: number | undefined
    let completionTokens = 0
    let firstToken: number | undefined
    let partial = ''
    const streamer = new TextStreamer(generate.tokenizer, {
      skip_prompt: false,
      skip_special_tokens: true,
      // The prompt text comes through here too, before the first generated token
      callback_function: piece => {
        if (firstToken === undefined) return
        partial += piece
        post({ type: 'partial', id: data.id, text: partial, tokens: completionTokens })
      },
      token_callback_function: tokens => {
        if (promptTokens === undefined) promptTokens = tokens.length
        else {
          firstToken ??= performance.now()
          completionTokens += tokens.length
        }
      },
    })
    const started = performance.now()
    const [output] = await generate([{ role: 'user', content: data.prompt }],
      { max_new_tokens: data.maxTokens, do_sample: false, streamer })
    const finished = performance.now()
    const chat = (output as { generated_text: { content: string }[] }).generated_text
    const decodeSeconds = firstToken === undefined ? 0 : (finished - firstToken) / 1000
    post({
      type: 'result',
      id: data.id,
      text: chat.at(-1)!.content,
      usage: {
        promptTokens,
        completionTokens,
        ...(firstToken !== undefined && { timeToFirstToken: (firstToken - started) / 1000 }),
        ...(firstToken !== undefined && promptTokens && { prefillTokensPerS: promptTokens / ((firstToken - started) / 1000) }),
        ...(decodeSeconds > 0 && { decodeTokensPerS: (completionTokens - 1) / decodeSeconds }),
      },
    })
  } catch (error) {
    post({ type: 'failed', id: data.id, message: message(error) })
  }
}
