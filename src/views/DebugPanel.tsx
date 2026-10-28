import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { debug, subscribeDebug, type Call, type DebugState, type Run, type Stage } from '../lib/debug'
import {
  getActiveModel, getStatus, MODELS, setActiveModel, subscribe, subscribeActiveModel, type EngineStatus, type ModelId,
} from '../lib/llm/engine'
import { EXTRACTION_SCHEMA, JUDGMENT_SCHEMA } from '../lib/llm/semantic'

// Developer view of everything the language model pipeline does: engine, calls, pipeline runs,
// live ranking, browser environment and model storage. English only, like the model's own reasons.

const TABS = ['overview', 'pipeline', 'calls', 'ranking', 'engine', 'storage'] as const
type Tab = (typeof TABS)[number]
const TAB_NAMES: Record<Tab, string> = {
  overview: 'Overview', pipeline: 'Pipeline', calls: 'Calls', ranking: 'Ranking', engine: 'Engine log', storage: 'Storage',
}

const OPEN_KEY = 'psyykkeri.debug.open'
const TAB_KEY = 'psyykkeri.debug.tab'
const stored = (key: string) => { try { return localStorage.getItem(key) } catch { return null } }
const store = (key: string, value: string) => { try { localStorage.setItem(key, value) } catch { /* private mode */ } }

const clock = (at: number) => {
  const d = new Date(at)
  const two = (n: number) => String(n).padStart(2, '0')
  return `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`
}
const ms = (value: number | undefined) =>
  value === undefined ? '–' : value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`
const num = (value: number | undefined, digits = 1) => (value === undefined || Number.isNaN(value) ? '–' : value.toFixed(digits))
const bytes = (value: number | undefined) =>
  value === undefined ? '–' : value >= 2 ** 30 ? `${(value / 2 ** 30).toFixed(2)} GB` : `${(value / 2 ** 20).toFixed(1)} MB`
const json = (value: unknown) => {
  try { return JSON.stringify(value, null, 2) } catch { return String(value) }
}
const pretty = (text: string | undefined): { ok: boolean; text: string } => {
  if (text === undefined) return { ok: false, text: '' }
  try { return { ok: true, text: JSON.stringify(JSON.parse(text), null, 2) } } catch (error) {
    return { ok: false, text: error instanceof Error ? error.message : String(error) }
  }
}

const callKind = (call: Call) =>
  call.schema === EXTRACTION_SCHEMA ? 'extraction' : call.schema === JUDGMENT_SCHEMA ? 'judgment' : 'other'
// A queued call is either behind another call or waiting for its model to finish loading
const callState = (call: Call, engine: EngineStatus) =>
  call.error ? 'failed' : call.finishedAt ? 'done'
  : call.firstTokenAt ? 'generating' : call.startedAt ? 'prefill'
  : engine.state === 'loading' && engine.model === call.model ? 'loading model' : 'queued'
// Running calls count up to now
const generationMs = (call: Call) =>
  call.startedAt ? (call.finishedAt ?? Date.now()) - call.startedAt : undefined
const modelLabel = (id: string) => MODELS.find(m => m.id === id)?.name ?? id

const Json = ({ value, max }: { value: unknown; max?: boolean }) => (
  <pre className={max ? 'debug-pre tall' : 'debug-pre'}>{typeof value === 'string' ? value : json(value)}</pre>
)

const Copy = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false)
  return (
    <button className="link debug-copy" onClick={() => navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    })}>{copied ? 'Copied' : 'Copy'}</button>
  )
}

const Block = ({ title, text, children }: { title: string; text?: string; children: ReactNode }) => (
  <section className="debug-block">
    <h4>{title}{text !== undefined && <Copy text={text} />}</h4>
    {children}
  </section>
)

const Facts = ({ rows }: { rows: [string, ReactNode][] }) => (
  <dl className="debug-facts">
    {rows.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value ?? '–'}</dd></div>)}
  </dl>
)

// Browser facts that decide whether and how fast the model runs
type Environment = Record<string, unknown>
const LIMITS = ['maxBufferSize', 'maxStorageBufferBindingSize', 'maxComputeWorkgroupStorageSize',
  'maxComputeInvocationsPerWorkgroup', 'maxStorageBuffersPerShaderStage']

const readEnvironment = async (): Promise<Environment> => {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const base: Environment = {
    userAgent: nav.userAgent,
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemoryGB: nav.deviceMemory,
    crossOriginIsolated: globalThis.crossOriginIsolated,
    webgpu: Boolean(nav.gpu),
  }
  if (!nav.gpu) return base
  try {
    // Older browsers flag a software adapter on the adapter, newer ones on its info
    const adapter = await nav.gpu.requestAdapter() as (GPUAdapter & { isFallbackAdapter?: boolean }) | null
    if (!adapter) return { ...base, adapter: 'requestAdapter() returned null' }
    const info = adapter.info as GPUAdapterInfo & { isFallbackAdapter?: boolean }
    const limits = adapter.limits as unknown as Record<string, number>
    return {
      ...base,
      adapter: {
        vendor: info.vendor, architecture: info.architecture, device: info.device, description: info.description,
        fallback: adapter.isFallbackAdapter ?? info.isFallbackAdapter,
      },
      shaderF16: [...adapter.features].includes('shader-f16'),
      features: [...adapter.features].sort(),
      limits: Object.fromEntries(LIMITS.map(key => [key, limits[key]])),
    }
  } catch (error) {
    return { ...base, adapter: error instanceof Error ? error.message : String(error) }
  }
}

type CacheInfo = { name: string; entries: number; bytes: number; files: { url: string; bytes: number }[] }
type StorageInfo = {
  usage?: number
  quota?: number
  details?: Record<string, number>
  persisted?: boolean
  caches: CacheInfo[]
  error?: string
}

// Model files live in Cache Storage. Sizes come from the stored headers, so no file is read.
const readStorage = async (): Promise<StorageInfo> => {
  try {
    const estimate = await navigator.storage?.estimate() as (StorageEstimate & { usageDetails?: Record<string, number> }) | undefined
    const persisted = await navigator.storage?.persisted?.()
    const names = typeof caches === 'undefined' ? [] : await caches.keys()
    const list = await Promise.all(names.map(async name => {
      const cache = await caches.open(name)
      const requests = await cache.keys()
      const files = await Promise.all(requests.map(async request => {
        const response = await cache.match(request)
        return { url: request.url, bytes: Number(response?.headers.get('content-length') ?? 0) }
      }))
      return { name, entries: files.length, bytes: files.reduce((sum, f) => sum + f.bytes, 0), files }
    }))
    return { usage: estimate?.usage, quota: estimate?.quota, details: estimate?.usageDetails, persisted, caches: list }
  } catch (error) {
    return { caches: [], error: error instanceof Error ? error.message : String(error) }
  }
}

const Overview = ({ state, engine, environment }: { state: DebugState; engine: EngineStatus; environment: Environment | null }) => {
  const loaded = [...state.engine].reverse().find(e => e.event === 'ready' && 'model' in engine && e.model === engine.model)
  const perModel = MODELS.map(m => {
    const calls = state.calls.filter(c => c.model === m.id)
    const done = calls.filter(c => c.finishedAt && !c.error)
    const decode = done.map(c => c.usage?.decodeTokensPerS).filter((v): v is number => v !== undefined)
    return {
      model: m,
      calls: calls.length,
      failed: calls.filter(c => c.error).length,
      meanMs: done.length ? done.reduce((s, c) => s + (generationMs(c) ?? 0), 0) / done.length : undefined,
      decode: decode.length ? decode.reduce((s, v) => s + v, 0) / decode.length : undefined,
      tokensIn: done.reduce((s, c) => s + (c.usage?.promptTokens ?? 0), 0),
      tokensOut: done.reduce((s, c) => s + (c.usage?.completionTokens ?? 0), 0),
    }
  })
  const active = useSyncExternalStore(subscribeActiveModel, getActiveModel)
  return (
    <>
      <Block title="Model for patient searches">
        <label className="debug-filter">
          Model
          <select value={active} onChange={e => setActiveModel(e.target.value as ModelId)}>
            {MODELS.map(m => <option key={m.id} value={m.id}>{m.name} · {m.runtime} · {m.downloadGB} GB</option>)}
          </select>
        </label>
        <p className="hint">
          Used by the next patient search. It starts loading right away when the language model switch is on,
          and the previous model is unloaded first. The choice is kept in this browser.
        </p>
      </Block>
      <Block title="Engine">
        <Facts rows={[
          ['State', <span className={`debug-state ${engine.state}`}>{engine.state}</span>],
          ['Model', 'model' in engine ? `${modelLabel(engine.model)} (${engine.model})` : '–'],
          ['Runtime', 'model' in engine ? MODELS.find(m => m.id === engine.model)?.runtime : '–'],
          ['Progress', engine.state === 'loading' ? `${Math.round(engine.progress * 100)} % · ${engine.text}` : '–'],
          ['Error', engine.state === 'error' ? engine.message : '–'],
          ['Load time', loaded ? ms(loaded.ms) : '–'],
        ]} />
      </Block>
      {loaded?.info && <Block title="Loaded model" text={json(loaded.info)}><Json value={loaded.info} /></Block>}
      <Block title="Models">
        <table className="debug-table">
          <thead><tr><th>Model</th><th>Runtime</th><th>Download</th><th>Calls</th><th>Failed</th><th>Mean time</th><th>Decode tok/s</th><th>Tokens in / out</th></tr></thead>
          <tbody>
            {perModel.map(row => (
              <tr key={row.model.id}>
                <td title={row.model.id}>{row.model.name}</td>
                <td>{row.model.runtime}</td>
                <td>{row.model.downloadGB} GB</td>
                <td>{row.calls}</td>
                <td>{row.failed}</td>
                <td>{ms(row.meanMs)}</td>
                <td>{num(row.decode)}</td>
                <td>{row.tokensIn} / {row.tokensOut}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Block>
      <Block title="Browser" text={environment ? json(environment) : undefined}>
        {environment ? <Json value={environment} /> : <p className="hint">Reading WebGPU adapter…</p>}
      </Block>
    </>
  )
}

// Raw answer items the grounding step threw away: unknown ids, made-up sentence numbers, duplicates, over the limit
const droppedItems = (stage: Stage) => {
  try {
    const answer = JSON.parse(String(stage.data.answer)) as Record<string, unknown>
    const kept = (list: unknown) => new Set((list as { id: string }[]).map(item => item.id))
    const lost = (key: 'tags' | 'constraints') => {
      const ids = kept(stage.data[key])
      return (Array.isArray(answer[key]) ? answer[key] as { id?: string }[] : []).filter(item => !ids.has(String(item?.id)))
    }
    return { tags: lost('tags'), constraints: lost('constraints') }
  } catch {
    return null
  }
}

const StageView = ({ stage, start }: { stage: Stage; start: number }) => {
  const text = json(stage.data)
  const dropped = stage.name === 'Parsed extraction' ? droppedItems(stage) : null
  return (
    <details className="debug-stage" open={text.length < 700}>
      <summary>
        <span className="debug-offset">+{ms(stage.at - start)}</span>
        <strong>{stage.name}</strong>
        {stage.ms !== undefined && <span className="hint">{ms(stage.ms)}</span>}
      </summary>
      {dropped && (dropped.tags.length > 0 || dropped.constraints.length > 0) && (
        <div className="debug-dropped">
          <strong>Dropped by grounding</strong>
          <Json value={dropped} />
        </div>
      )}
      <Json value={stage.data} />
      <Copy text={text} />
    </details>
  )
}

const Pipeline = ({ state, onCall }: { state: DebugState; onCall: (id: number) => void }) => {
  const runs = [...state.runs].reverse()
  const [selected, setSelected] = useState<number | null>(null)
  const run: Run | undefined = runs.find(r => r.id === selected) ?? runs[0]
  if (!run) return <p className="hint">No pipeline runs yet. Open a patient to start one.</p>
  const calls = state.calls.filter(c => c.runId === run.id)
  return (
    <div className="debug-split">
      <ul className="debug-list">
        {runs.map(r => (
          <li key={r.id}>
            <button className={r.id === run.id ? 'debug-item active' : 'debug-item'} onClick={() => setSelected(r.id)}>
              <strong>{r.label}</strong>
              <span className="hint">{clock(r.startedAt)} · {r.finishedAt ? ms(r.finishedAt - r.startedAt) : 'running'} · {r.stages.length} steps</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="debug-detail">
        <h3>{run.label}</h3>
        <p className="hint">Started {clock(run.startedAt)}{run.finishedAt && `, took ${ms(run.finishedAt - run.startedAt)}`}</p>
        {run.stages.map((stage, i) => <StageView key={i} stage={stage} start={run.startedAt} />)}
        <Block title={`Model calls (${calls.length})`}>
          {calls.length === 0 ? <p className="hint">This run made no model calls.</p> : (
            <CallTable calls={calls} selected={null} onSelect={onCall} />
          )}
        </Block>
      </div>
    </div>
  )
}

const CallTable = ({ calls, selected, onSelect }: { calls: Call[]; selected: number | null; onSelect: (id: number) => void }) => {
  const engine = useSyncExternalStore(subscribe, getStatus)
  return (
  <table className="debug-table selectable">
    <thead>
      <tr><th>#</th><th>Queued</th><th>Model</th><th>Kind</th><th>State</th><th>Wait</th><th>Generation</th><th>Tokens in / out</th><th>Decode tok/s</th></tr>
    </thead>
    <tbody>
      {calls.map(call => (
        <tr key={call.id} className={call.id === selected ? 'active' : undefined} tabIndex={0}
          onClick={() => onSelect(call.id)} onKeyDown={e => e.key === 'Enter' && onSelect(call.id)}>
          <td>{call.id}</td>
          <td>{clock(call.queuedAt)}</td>
          <td title={call.model}>{modelLabel(call.model)}</td>
          <td>{callKind(call)}</td>
          <td><span className={`debug-state ${callState(call, engine).replace(' ', '-')}`}>{callState(call, engine)}</span></td>
          <td>{call.startedAt ? ms(call.startedAt - call.queuedAt) : '–'}</td>
          <td>{ms(generationMs(call))}</td>
          <td>{call.usage?.promptTokens ?? '–'} / {call.usage?.completionTokens ?? '–'}</td>
          <td>{num(call.usage?.decodeTokensPerS)}</td>
        </tr>
      ))}
    </tbody>
  </table>
  )
}

const CallDetail = ({ call }: { call: Call }) => {
  const parsed = pretty(call.output)
  return (
    <div className="debug-detail">
      <h3>Call {call.id}: {callKind(call)} · {modelLabel(call.model)}</h3>
      <Facts rows={[
        ['Model id', call.model],
        ['Runtime', call.runtime],
        ['Run', call.runId ?? 'none'],
        ['Queued', clock(call.queuedAt)],
        ['Waited in queue', call.startedAt ? ms(call.startedAt - call.queuedAt) : '–'],
        ['Of which model load', ms(call.loadMs)],
        ['Generation', ms(generationMs(call))],
        ['Prompt tokens', call.usage?.promptTokens],
        ['Completion tokens', call.usage?.completionTokens],
        ['Time to first token', call.usage?.timeToFirstToken !== undefined ? `${num(call.usage.timeToFirstToken, 2)} s` : '–'],
        ['Prefill tok/s', num(call.usage?.prefillTokensPerS)],
        ['Decode tok/s', num(call.usage?.decodeTokensPerS)],
        ['Prompt characters', call.prompt.length],
        ['First token after', call.firstTokenAt && call.startedAt ? ms(call.firstTokenAt - call.startedAt)
          : call.startedAt && !call.finishedAt ? 'not yet' : '–'],
        ['Streamed tokens', call.streamedTokens],
      ]} />
      {call.error && <Block title="Error"><p className="error">{call.error}</p></Block>}
      {call.startedAt && !call.finishedAt && (
        <Block title="Answer so far">
          {call.partial
            ? <Json value={call.partial} max />
            : <p className="hint">No tokens yet: the model is still reading the prompt (prefill).</p>}
        </Block>
      )}
      <Block title="Prompt sent to the model" text={call.sent ?? call.prompt}><Json value={call.sent ?? call.prompt} max /></Block>
      {call.raw !== undefined && <Block title="Raw answer" text={call.raw}><Json value={call.raw} max /></Block>}
      {call.output !== undefined && (
        <Block title={parsed.ok ? 'Answer as JSON' : 'Answer is not valid JSON'} text={parsed.text}>
          {parsed.ok ? <Json value={parsed.text} max /> : <p className="error">{parsed.text}</p>}
        </Block>
      )}
      <Block title="Generation options" text={json(call.options)}><Json value={call.options ?? {}} /></Block>
      <Block title="JSON schema" text={json(call.schema)}><Json value={call.schema} max /></Block>
    </div>
  )
}

const Calls = ({ state, selected, onSelect }: { state: DebugState; selected: number | null; onSelect: (id: number) => void }) => {
  const [model, setModel] = useState('all')
  const calls = [...state.calls].reverse().filter(c => model === 'all' || c.model === model)
  const call = state.calls.find(c => c.id === selected) ?? calls[0]
  if (state.calls.length === 0) return <p className="hint">No model calls yet.</p>
  return (
    <>
      <label className="debug-filter">
        Model
        <select value={model} onChange={e => setModel(e.target.value)}>
          <option value="all">All models</option>
          {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
      <div className="debug-scroll"><CallTable calls={calls} selected={call?.id ?? null} onSelect={onSelect} /></div>
      {call && <CallDetail call={call} />}
    </>
  )
}

const Ranking = ({ state }: { state: DebugState }) => {
  const ranking = state.ranking
  if (!ranking) return <p className="hint">The ranking appears once a results page is open.</p>
  return (
    <>
      <p className="hint">
        Updated {clock(ranking.at)}. Tags: {ranking.tags.join(', ') || 'none'}. Final score = tag score (IDF cosine) × weight.
        {' '}{ranking.rows.filter(r => r.visible).length} of {ranking.rows.length} shown after filters.
      </p>
      <div className="debug-scroll">
        <table className="debug-table">
          <thead>
            <tr><th>#</th><th>Service</th><th>Tag score</th><th>Weight</th><th>Final</th><th>Matched</th><th>Adjustments</th><th>km</th><th>Seats</th><th>Shown</th></tr>
          </thead>
          <tbody>
            {ranking.rows.map((row, i) => (
              <tr key={`${row.serviceKey}-${i}`} className={row.visible ? undefined : 'muted'}>
                <td>{i + 1}</td>
                <td><strong>{row.name}</strong><div className="hint">{row.organiser}</div></td>
                <td>{num(row.tagScore, 3)}</td>
                <td>{num(row.weight, 2)}</td>
                <td><strong>{num(row.score, 3)}</strong></td>
                <td>{row.matched.join(', ')}</td>
                <td>{row.adjustments.length === 0 ? '–' : row.adjustments.map((a, j) => (
                  <div key={j}>{a.kind} ×{a.weight}: {a.detail}</div>
                ))}</td>
                <td>{row.distanceKm === null ? '–' : num(row.distanceKm)}</td>
                <td>{row.seatsLeft ?? '–'}</td>
                <td>{row.visible ? 'yes' : 'no'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

const EngineLog = ({ state }: { state: DebugState }) => {
  if (state.engine.length === 0) return <p className="hint">The engine has not loaded a model yet.</p>
  return (
    <div className="debug-scroll">
      <table className="debug-table">
        <thead><tr><th>Time</th><th>Event</th><th>Model</th><th>Runtime</th><th>Took</th><th>Details</th></tr></thead>
        <tbody>
          {[...state.engine].reverse().map((e, i) => (
            <tr key={i}>
              <td>{clock(e.at)}</td>
              <td><span className={`debug-state ${e.event}`}>{e.event}</span></td>
              <td title={e.model}>{modelLabel(e.model)}</td>
              <td>{e.runtime}</td>
              <td>{ms(e.ms)}</td>
              <td>{e.message && <span className="error">{e.message}</span>}{e.info && (
                <details><summary>Model details</summary><Json value={e.info} /></details>
              )}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const Storage = ({ info, onRefresh }: { info: StorageInfo | null; onRefresh: () => void }) => {
  const [message, setMessage] = useState('')
  if (!info) return <p className="hint">Reading storage…</p>
  const remove = async (name: string) => {
    if (!confirm(`Delete the cache "${name}"? The model files in it are downloaded again on next use.`)) return
    await caches.delete(name)
    onRefresh()
  }
  const persist = async () => {
    const granted = await navigator.storage?.persist?.()
    setMessage(granted ? 'The browser granted persistent storage.' : 'The browser declined persistent storage.')
    onRefresh()
  }
  return (
    <>
      <Block title="Quota">
        <Facts rows={[
          ['Used by this site', bytes(info.usage)],
          ['Quota', bytes(info.quota)],
          ['Persistent', info.persisted === undefined ? 'unknown' : info.persisted ? 'yes' : 'no, the browser may evict the files'],
          ...Object.entries(info.details ?? {}).map(([key, value]): [string, ReactNode] => [`Usage: ${key}`, bytes(value)]),
        ]} />
        <div className="actions">
          {!info.persisted && <button className="secondary" onClick={persist}>Request persistent storage</button>}
          <button className="secondary" onClick={onRefresh}>Refresh</button>
        </div>
        {message && <p className="hint">{message}</p>}
        {info.error && <p className="error">{info.error}</p>}
      </Block>
      <Block title={`Cache Storage (${info.caches.length})`}>
        {info.caches.length === 0 ? <p className="hint">No caches. Models are downloaded on first use.</p> : (
          <table className="debug-table">
            <thead><tr><th>Cache</th><th>Files</th><th>Size</th><th /></tr></thead>
            <tbody>
              {info.caches.map(cache => (
                <tr key={cache.name}>
                  <td>
                    <strong>{cache.name}</strong>
                    <details><summary>Files</summary>
                      <ul className="debug-files">
                        {cache.files.map(f => <li key={f.url}><span>{f.url}</span> <span className="hint">{bytes(f.bytes)}</span></li>)}
                      </ul>
                    </details>
                  </td>
                  <td>{cache.entries}</td>
                  <td>{bytes(cache.bytes)}</td>
                  <td><button className="link" onClick={() => remove(cache.name)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Block>
    </>
  )
}

const download = (data: unknown) => {
  const url = URL.createObjectURL(new Blob([json(data)], { type: 'application/json' }))
  const link = Object.assign(document.createElement('a'), { href: url, download: `psyykkeri-debug-${Date.now()}.json` })
  link.click()
  URL.revokeObjectURL(url)
}

export const useDebugToggle = () => {
  const [open, setOpen] = useState(() => stored(OPEN_KEY) === '1')
  useEffect(() => store(OPEN_KEY, open ? '1' : '0'), [open])
  // Alt+Shift+D toggles the panel from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return [open, setOpen] as const
}

export const DebugPanel = ({ onClose }: { onClose: () => void }) => {
  const state = useSyncExternalStore(subscribeDebug, debug.snapshot)
  const engine = useSyncExternalStore(subscribe, getStatus)
  const [tab, setTab] = useState<Tab>(() => (TABS as readonly string[]).includes(stored(TAB_KEY) ?? '') ? stored(TAB_KEY) as Tab : 'overview')
  const [wide, setWide] = useState(false)
  const [selectedCall, setSelectedCall] = useState<number | null>(null)
  const [environment, setEnvironment] = useState<Environment | null>(null)
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const refreshStorage = () => { readStorage().then(setStorage) }

  useEffect(() => store(TAB_KEY, tab), [tab])
  // Running calls show a live elapsed time even when no tokens arrive
  const running = state.calls.some(c => c.startedAt && !c.finishedAt)
  const [, setNow] = useState(0)
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNow(n => n + 1), 500)
    return () => clearInterval(timer)
  }, [running])
  useEffect(() => { readEnvironment().then(setEnvironment) }, [])
  // Cache sizes change while a model downloads
  useEffect(() => { if (tab === 'storage') refreshStorage() }, [tab, engine.state])

  const failed = useMemo(() => state.calls.filter(c => c.error).length, [state.calls])
  const openCall = (id: number) => {
    setSelectedCall(id)
    setTab('calls')
  }

  return (
    <aside className={wide ? 'debug-panel wide' : 'debug-panel'} aria-label="Debug panel">
      <header className="titlebar">
        <h2>Debug <span className="hint">{state.calls.length} calls · {failed} failed · {state.runs.length} runs</span></h2>
        <div className="debug-actions">
          <button className="link" onClick={() => download({ exportedAt: new Date().toISOString(), engineStatus: engine, environment, storage, ...state })}>
            Export JSON
          </button>
          <button className="link" onClick={() => { debug.clear(); setSelectedCall(null) }}>Clear</button>
          <button className="link" aria-pressed={wide} onClick={() => setWide(w => !w)}>{wide ? 'Narrow' : 'Wide'}</button>
          <button className="titlebar-close" aria-label="Close debug panel" onClick={onClose}>×</button>
        </div>
      </header>
      <div className="debug-tabs" role="tablist">
        {TABS.map(id => (
          <button key={id} role="tab" aria-selected={id === tab} className={id === tab ? 'segment active' : 'segment'}
            onClick={() => setTab(id)}>
            {TAB_NAMES[id]}
          </button>
        ))}
      </div>
      <div className="debug-body" role="tabpanel">
        {tab === 'overview' && <Overview state={state} engine={engine} environment={environment} />}
        {tab === 'pipeline' && <Pipeline state={state} onCall={openCall} />}
        {tab === 'calls' && <Calls state={state} selected={selectedCall} onSelect={setSelectedCall} />}
        {tab === 'ranking' && <Ranking state={state} />}
        {tab === 'engine' && <EngineLog state={state} />}
        {tab === 'storage' && <Storage info={storage} onRefresh={refreshStorage} />}
      </div>
    </aside>
  )
}
