import { useEffect, useRef, useState } from 'react'
import type { Patient } from '../data/patients'
import type { Extraction, PatientExtractor } from '../lib/extraction'
import { animateWaves } from '../lib/waves'
import { useT } from '../i18n'
import { PatientBanner } from './PatientBanner'

// Minimum step durations keep the stages readable during a live pitch
const EXTRACT_MIN_MS = 2600
const MATCH_MIN_MS = 2200
const PHRASE_MS = 650

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const Waves = () => {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => (ref.current ? animateWaves(ref.current) : undefined), [])
  return <svg ref={ref} className="waves" viewBox="0 0 600 160" preserveAspectRatio="none" aria-hidden="true" />
}

export const Processing = ({
  patient,
  extractor,
  onDone,
}: {
  patient: Patient
  extractor: PatientExtractor
  onDone: (extraction: Extraction) => void
}) => {
  const { t } = useT()
  const [step, setStep] = useState<0 | 1>(0)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const [extraction] = await Promise.all([extractor(patient, new Date()), wait(EXTRACT_MIN_MS)])
      if (cancelled) return
      setStep(1)
      setTick(0)
      await wait(MATCH_MIN_MS)
      if (!cancelled) onDone(extraction)
    }
    run()
    return () => { cancelled = true }
  }, [patient, extractor, onDone])

  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), PHRASE_MS)
    return () => clearInterval(id)
  }, [])

  const steps = [t.stepExtract, t.stepMatch]
  const phrases = t.phrases[step]!
  const phrase = phrases[tick % phrases.length]

  return (
    <main className="content">
      <PatientBanner patient={patient} />
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
      </section>
    </main>
  )
}
