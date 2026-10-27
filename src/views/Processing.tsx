import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { GroupListing } from '../data/groups'
import type { Extraction, ExtractionInput, PatientExtractor } from '../lib/extraction'
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
    let cancelled = false
    const run = async () => {
      const now = new Date()
      const [extraction] = await Promise.all([extractor(input, now), wait(EXTRACT_MIN_MS)])
      if (cancelled) return
      setStep(1)
      setTick(0)
      // A profile means the language model did the extraction, so it can also review the matches
      if (!judge || !extraction.profile) {
        await wait(MATCH_MIN_MS)
        if (!cancelled) onDone(extraction)
        return
      }
      const age = ageAt(input.patient.hetu, now)
      const candidates = rankGroups(extraction.tags.map(tag => tag.id), input.patient.homeCoords, groups,
        { age, municipality: input.patient.municipality }).slice(0, JUDGE_TOP).map(m => m.group)
      const [judgments] = await Promise.all([
        judge(extraction, age, candidates, (done, total) => { if (!cancelled) setJudged({ done, total }) }),
        wait(MATCH_MIN_MS),
      ])
      if (!cancelled) onDone({ ...extraction, judgments })
    }
    run()
    return () => { cancelled = true }
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
