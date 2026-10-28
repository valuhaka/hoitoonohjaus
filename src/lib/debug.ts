// Under-the-hood record of the language model pipeline for the debug panel (src/views/DebugPanel.tsx).
// Held in memory only and lost on reload; nothing here leaves the browser.

export type Usage = {
  promptTokens?: number
  completionTokens?: number
  // Seconds from the request to the first generated token
  timeToFirstToken?: number
  prefillTokensPerS?: number
  decodeTokensPerS?: number
}

// One completion. The prompt is the one the caller built; `sent` is what reached the model.
export type Call = {
  id: number
  runId: number | null
  model: string
  runtime: string
  prompt: string
  schema: object
  queuedAt: number
  startedAt?: number
  finishedAt?: number
  // Time spent waiting for the model to load before this call could start
  loadMs?: number
  sent?: string
  options?: Record<string, unknown>
  // Text streamed so far while the call runs
  partial?: string
  streamedTokens?: number
  firstTokenAt?: number
  raw?: string
  output?: string
  usage?: Usage
  error?: string
}

export type EngineEvent = {
  at: number
  model: string
  runtime: string
  event: 'load' | 'ready' | 'error' | 'unload'
  ms?: number
  message?: string
  // Model and runtime details reported once the model is ready
  info?: Record<string, unknown>
}

// A snapshot of one pipeline step: what went in, what came out
export type Stage = { at: number; name: string; ms?: number; data: Record<string, unknown> }

export type Run = { id: number; label: string; startedAt: number; finishedAt?: number; stages: Stage[] }

// The ranking the results page shows right now, after the second ranking stage
export type RankingRow = {
  name: string
  organiser: string
  serviceKey: string
  tagScore: number
  weight: number
  score: number
  matched: string[]
  distanceKm: number | null
  seatsLeft: number | null
  visible: boolean
  adjustments: { kind: string; detail: string; weight: number }[]
}
export type Ranking = { at: number; tags: string[]; rows: RankingRow[] }

export type DebugState = { calls: Call[]; engine: EngineEvent[]; runs: Run[]; ranking: Ranking | null }

const LIMIT = 200
const RUN_LIMIT = 30
const empty: DebugState = { calls: [], engine: [], runs: [], ranking: null }

let state = empty
let nextId = 1
let openRun: number | null = null
const listeners = new Set<() => void>()
const set = (next: DebugState) => {
  state = next
  listeners.forEach(listener => listener())
}
// For useSyncExternalStore
export const subscribeDebug = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const capped = <T>(items: T[], limit = LIMIT) => items.slice(-limit)
const updateRun = (id: number | null, change: (run: Run) => Run) =>
  id !== null && set({ ...state, runs: state.runs.map(run => (run.id === id ? change(run) : run)) })

export const debug = {
  call: (fields: Pick<Call, 'model' | 'runtime' | 'prompt' | 'schema'>): number => {
    const id = nextId++
    set({ ...state, calls: capped([...state.calls, { ...fields, id, runId: openRun, queuedAt: Date.now() }]) })
    return id
  },
  updateCall: (id: number, patch: Partial<Call>) =>
    set({ ...state, calls: state.calls.map(call => (call.id === id ? { ...call, ...patch } : call)) }),
  engine: (event: Omit<EngineEvent, 'at'>) =>
    set({ ...state, engine: capped([...state.engine, { ...event, at: Date.now() }]) }),
  // A run groups the steps and calls of one patient search. Calls made while it is open belong to it.
  beginRun: (label: string): number => {
    const id = nextId++
    openRun = id
    set({ ...state, runs: capped([...state.runs, { id, label, startedAt: Date.now(), stages: [] }], RUN_LIMIT) })
    return id
  },
  // Async steps pass the run they started in, so a late answer never lands in a newer run
  currentRun: () => openRun,
  stage: (name: string, data: Record<string, unknown>, ms?: number, runId = openRun) =>
    updateRun(runId, run => ({ ...run, stages: [...run.stages, { at: Date.now(), name, ms, data }] })),
  endRun: (id: number) => {
    if (openRun === id) openRun = null
    updateRun(id, run => ({ ...run, finishedAt: Date.now() }))
  },
  ranking: (ranking: Omit<Ranking, 'at'>) => set({ ...state, ranking: { ...ranking, at: Date.now() } }),
  clear: () => {
    openRun = null
    set(empty)
  },
  snapshot: () => state,
}
