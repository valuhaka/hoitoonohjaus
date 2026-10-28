import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { GroupListing } from '../data/groups'
import { debug } from '../lib/debug'
import { selectedEntries, type Extraction, type ExtractionInput, type PatientExtractor } from '../lib/extraction'
import { ageAt } from '../lib/hetu'
import { getStatus, modelName, subscribe } from '../lib/llm/engine'
import type { Judge } from '../lib/llm/semantic'
import { rankGroups } from '../lib/match'
import { animateWaves } from '../lib/waves'
import { useT } from '../i18n'
import { PatientBanner } from './PatientBanner'

// Minimum step durations keep the stages readable during a live pitch
const EXTRACT_MIN_MS = 2100
const MATCH_MIN_MS = 3000
const PHRASE_MS = 1000
// The language model reviews only the best tag matches; each review is one model call
const JUDGE_TOP = 10

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

type Judged = { done: number; total: number }
type Watcher = { onStep: (step: 1) => void; onJudged: (judged: Judged) => void }

// One pipeline per opened record. React StrictMode mounts this screen twice in development; both
// mounts watch the same job, so the model is asked once. Model calls cannot be aborted, so a job
// nobody watches any more still finishes its extraction but stops before the judgments.
type Job = {
  extractor: PatientExtractor
  judge?: Judge
  groups: GroupListing[]
  watchers: Set<Watcher>
  step: 0 | 1
  judged: Judged | null
  result: Promise<Extraction | null>
}
const jobs = new WeakMap<ExtractionInput, Job>()

const startJob = (input: ExtractionInput, extractor: PatientExtractor, judge: Judge | undefined, groups: GroupListing[]) => {
  const { patient } = input
  const runId = debug.beginRun(`${patient.firstNames.split(' ')[0]} ${patient.lastName}`)
  const job: Job = { extractor, judge, groups, watchers: new Set(), step: 0, judged: null, result: Promise.resolve(null) }
  const abandoned = () => {
    if (job.watchers.size > 0) return false
    debug.stage('Cancelled', { reason: 'the processing screen closed before the run finished' }, undefined, runId)
    return true
  }

  const run = async (): Promise<Extraction | null> => {
    const now = new Date()
    debug.stage('Input', {
      age: ageAt(patient.hetu, now),
      municipality: patient.municipality,
      registers: input.registers,
      entries: selectedEntries(input).length,
      freeTextChars: input.freeText.length,
      navigator: input.navigator,
      listings: groups.length,
      judge: Boolean(judge),
    }, undefined, runId)
    const started = performance.now()
    const extraction = await extractor(input, now)
    debug.stage('Extraction', { ...extraction }, performance.now() - started, runId)
    await wait(EXTRACT_MIN_MS - (performance.now() - started))
    if (abandoned()) return null
    job.step = 1
    job.watchers.forEach(w => w.onStep(1))
    // A profile means the language model did the extraction, so it can also review the matches
    if (!judge || !extraction.profile) {
      debug.stage('Judgments skipped', { reason: judge ? 'keyword extraction has no profile' : 'language model is off' },
        undefined, runId)
      await wait(MATCH_MIN_MS)
      return extraction
    }
    const age = ageAt(patient.hetu, now)
    const ranked = rankGroups(extraction.tags.map(tag => tag.id), patient.homeCoords, groups,
      { age, municipality: patient.municipality })
    const candidates = ranked.slice(0, JUDGE_TOP).map(m => m.group)
    debug.stage('Tag matching', {
      eligibleMatches: ranked.length,
      judged: candidates.length,
      top: ranked.slice(0, JUDGE_TOP).map(m => ({
        name: m.group.name, score: m.score, matched: m.matched, distanceKm: m.distanceKm, seatsLeft: m.seatsLeft,
      })),
    }, undefined, runId)
    const judging = performance.now()
    const judgments = await judge(extraction, age, candidates, (done, total) => {
      job.judged = { done, total }
      job.watchers.forEach(w => w.onJudged({ done, total }))
    })
    debug.stage('Judgments', { judgments }, performance.now() - judging, runId)
    await wait(MATCH_MIN_MS - (performance.now() - judging))
    return { ...extraction, judgments }
  }

  job.result = run().finally(() => {
    debug.endRun(runId)
    jobs.delete(input)
  })
  jobs.set(input, job)
  return job
}

const Waves = () => {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => (ref.current ? animateWaves(ref.current) : undefined), [])
  return <svg ref={ref} className="waves" viewBox="0 0 600 160" preserveAspectRatio="none" aria-hidden="true" />
}

export const Processing = ({
  input,
  extractor,
  judge,
  groups,
  onDone,
}: {
  input: ExtractionInput
  extractor: PatientExtractor
  // Without a judge the match step only ranks by tags
  judge?: Judge
  groups: GroupListing[]
  onDone: (extraction: Extraction) => void
}) => {
  const { t } = useT()
  const [step, setStep] = useState<0 | 1>(0)
  const [tick, setTick] = useState(0)
  const [judged, setJudged] = useState<{ done: number; total: number } | null>(null)
  const engine = useSyncExternalStore(subscribe, getStatus)

  useEffect(() => {
    const existing = jobs.get(input)
    const job = existing && existing.extractor === extractor && existing.judge === judge && existing.groups === groups
      ? existing
      : startJob(input, extractor, judge, groups)
    let watching = true
    const watcher: Watcher = {
      onStep: next => {
        setStep(next)
        setTick(0)
      },
      onJudged: setJudged,
    }
    job.watchers.add(watcher)
    // A second mount joins a job that may already be further along
    setStep(job.step)
    setJudged(job.judged)
    job.result.then(extraction => { if (watching && extraction) onDone(extraction) })
    return () => {
      watching = false
      job.watchers.delete(watcher)
    }
  }, [input, extractor, judge, groups, onDone])

  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), PHRASE_MS)
    return () => clearInterval(id)
  }, [])

  const steps = [t.stepExtract, t.stepMatch]
  const phrases = t.phrases[step]!
  const phrase = phrases[tick % phrases.length]

  return (
    <main className="content">
      <PatientBanner patient={input.patient} />
      <section className="processing">
        <Waves />
        <ol className="steps" aria-live="polite">
          {steps.map((label, i) => (
            <li key={label} className={i < step ? 'done' : i === step ? 'active' : 'pending'}>
              <span className="step-icon">{i + 1}</span>
              {label}
            </li>
          ))}
        </ol>
        <p key={`${step}-${tick}`} className="phrase" aria-hidden="true">{phrase}…</p>
        {judge && engine.state === 'loading' && (
          <p className="engine-status">{t.ai.loading(modelName(engine.model), Math.round(engine.progress * 100))}</p>
        )}
        {judge && engine.state === 'error' && <p className="engine-status">{t.ai.failed}</p>}
        {step === 1 && judged && <p className="engine-status">{t.ai.judging(judged.done, judged.total)}</p>}
      </section>
    </main>
  )
}
