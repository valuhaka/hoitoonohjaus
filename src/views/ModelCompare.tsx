import { useEffect, useState, useSyncExternalStore } from 'react'
import { REAL_GROUPS } from '../data/listings'
import { PATIENTS, type Patient } from '../data/patients'
import { debug } from '../lib/debug'
import { allData, mockExtractor, type Extraction, type Judgment } from '../lib/extraction'
import { ageAt } from '../lib/hetu'
import { completeWith, getStatus, MODELS, modelName, subscribe, type ModelId } from '../lib/llm/engine'
import { createJudge, createModelExtractor } from '../lib/llm/semantic'
import { serviceKey } from '../lib/match'
import { useT } from '../i18n'

// The group from the original example: a good model says yes only for the widowed 68-year-old
const WIDOW_GROUP = REAL_GROUPS.find(g => g.serviceId === 'mieli-ikaihmiset-lesket')!

type Cell = { extraction?: Extraction; judgment?: Judgment; seconds: number; error?: string }
const cellKey = (model: ModelId, patient: Patient) => `${model}|${patient.hetu}`

const run = async (model: ModelId, patient: Patient, now: Date): Promise<Cell> => {
  const started = performance.now()
  const complete = completeWith(model)
  const runId = debug.beginRun(`Comparison: ${modelName(model)} · ${patient.firstNames.split(' ')[0]} ${patient.lastName}`)
  try {
    const extraction = await createModelExtractor(complete, model)(allData(patient), now)
    const judgments = await createJudge(complete)(extraction, ageAt(patient.hetu, now), [WIDOW_GROUP], () => undefined)
    return { extraction, judgment: judgments[serviceKey(WIDOW_GROUP)], seconds: (performance.now() - started) / 1000 }
  } catch (error) {
    return { seconds: (performance.now() - started) / 1000, error: error instanceof Error ? error.message : String(error) }
  } finally {
    debug.endRun(runId)
  }
}

const Tags = ({ extraction }: { extraction: Extraction }) => (
  <div className="tags">
    {extraction.tags.map(tag => <span key={tag.id} className="tag" title={tag.evidence}>{tag.id}</span>)}
    {extraction.constraints.map(c => <span key={c.id} className="tag constraint" title={c.evidence}>{c.id}</span>)}
  </div>
)

export const ModelCompare = () => {
  const { t } = useT()
  const c = t.ai.compare
  const engine = useSyncExternalStore(subscribe, getStatus)
  const [models, setModels] = useState<ModelId[]>(MODELS.map(m => m.id))
  const [reference, setReference] = useState<Record<string, Extraction>>({})
  const [cells, setCells] = useState<Record<string, Cell>>({})
  const [running, setRunning] = useState(false)

  useEffect(() => {
    const now = new Date()
    Promise.all(PATIENTS.map(async p => [p.hetu, await mockExtractor(allData(p), now)] as const))
      .then(entries => setReference(Object.fromEntries(entries)))
  }, [])

  // Models run one after another: only one fits in GPU memory at a time
  const start = async () => {
    setRunning(true)
    setCells({})
    const now = new Date()
    for (const model of models) {
      for (const patient of PATIENTS) {
        const cell = await run(model, patient, now)
        setCells(all => ({ ...all, [cellKey(model, patient)]: cell }))
      }
    }
    setRunning(false)
  }

  const toggle = (id: ModelId) => setModels(ms => (ms.includes(id) ? ms.filter(m => m !== id) : [...ms, id]))

  return (
    <main className="content wide compare">
      <h1>{c.title}</h1>
      <p className="hint">{c.intro}</p>
      <div className="compare-controls">
        {MODELS.map(m => (
          <label key={m.id} className="check">
            <input type="checkbox" checked={models.includes(m.id)} disabled={running} onChange={() => toggle(m.id)} />
            <span>{m.name} ({m.downloadGB} GB)</span>
          </label>
        ))}
        <button className="primary" disabled={running || models.length === 0} onClick={start}>
          {running ? c.running : c.run}
        </button>
        <a href="#">{c.back}</a>
      </div>
      {engine.state === 'loading' && (
        <p className="hint">{t.ai.loading(modelName(engine.model), Math.round(engine.progress * 100))} · {engine.text}</p>
      )}
      {engine.state === 'error' && <p className="error">{engine.message}</p>}

      <div className="compare-scroll">
        <table className="compare-table">
          <thead>
            <tr>
              <th>{c.patient}</th>
              <th>{c.reference}</th>
              {models.map(m => <th key={m}>{modelName(m)}</th>)}
            </tr>
          </thead>
          <tbody>
            {PATIENTS.map(p => (
              <tr key={p.hetu}>
                <td>
                  <strong>{p.firstNames.split(' ')[0]} {p.lastName}</strong>
                  <div className="hint">{ageAt(p.hetu, new Date())} v</div>
                </td>
                <td>{reference[p.hetu] && <Tags extraction={reference[p.hetu]!} />}</td>
                {models.map(m => {
                  const cell = cells[cellKey(m, p)]
                  if (!cell) return <td key={m} />
                  if (cell.error) return <td key={m}><span className="error">{c.failed}: {cell.error}</span></td>
                  const { extraction, judgment } = cell
                  const preference = extraction?.profile?.sessionPreference
                  return (
                    <td key={m}>
                      {extraction && <Tags extraction={extraction} />}
                      {extraction?.profile?.situation && <p className="compare-situation">{extraction.profile.situation}</p>}
                      {preference && preference !== 'none' && (
                        <p className="hint" title={extraction?.profile?.sessionEvidence}>{t.ai.preference[preference]}</p>
                      )}
                      {judgment && (
                        <p className={`compare-fit ${judgment.fit}`}>
                          {c.widowGroup}: {t.ai.fit[judgment.fit]}{judgment.reason && ` – ${judgment.reason}`}
                        </p>
                      )}
                      <p className="hint">{c.seconds(cell.seconds)}</p>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
