import { useEffect, useState } from 'react'
import type { Patient } from '../data/patients'
import type { Extraction, PatientExtractor } from '../lib/extraction'
import { useT } from '../i18n'
import { PatientBanner } from './PatientBanner'

// Minimum step durations keep the stages readable during a live pitch
const EXTRACT_MIN_MS = 1800
const MATCH_MIN_MS = 1400

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const [extraction] = await Promise.all([extractor(patient, new Date()), wait(EXTRACT_MIN_MS)])
      if (cancelled) return
      setStep(1)
      await wait(MATCH_MIN_MS)
      if (!cancelled) onDone(extraction)
    }
    run()
    return () => { cancelled = true }
  }, [patient, extractor, onDone])

  const steps = [t.stepExtract, t.stepMatch]

  return (
    <main className="content">
      <PatientBanner patient={patient} />
      <section className="panel processing">
        <div className="spinner" />
        <ol className="steps">
          {steps.map((label, i) => (
            <li key={label} className={i < step ? 'done' : i === step ? 'active' : 'pending'}>
              <span className="step-icon">{i < step ? '✓' : i + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}
