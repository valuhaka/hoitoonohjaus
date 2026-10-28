import { HASHTAGS, HASHTAG_IDS, type HashtagId } from '../data/hashtags'
import { debug } from './debug'
import type { Patient, RegisterId } from '../data/patients'
import { ageAt } from './hetu'
import { NAVIGATORS, type NavigatorResult } from './navigator'

export type ExtractedTag = { id: HashtagId; evidence: string }

// Practical circumstances that shape which groups are realistic, not what to treat
export type ConstraintId = 'mobility' | 'working' | 'studying' | 'lowIncome' | 'older'
export type ExtractedConstraint = { id: ConstraintId; evidence: string }

// Read from the record by the language model; the keyword extractor leaves these out
export type SessionPreference = 'inPerson' | 'remote' | 'none'
export type PatientProfile = { situation: string; sessionPreference: SessionPreference; sessionEvidence?: string }

// The language model's verdict on whether the patient belongs to a service's target group
export type Fit = 'yes' | 'partly' | 'no'
export type Judgment = { fit: Fit; reason: string }

export type Extraction = {
  tags: ExtractedTag[]
  constraints: ExtractedConstraint[]
  source: string
  profile?: PatientProfile
  // Keyed by service (serviceId ?? id)
  judgments?: Record<string, Judgment>
}

// Exactly the data the user chose to use. Age always comes from the identity code.
export type ExtractionInput = {
  patient: Patient
  registers: RegisterId[]
  freeText: string
  navigator: NavigatorResult | null
}

export const allData = (patient: Patient): ExtractionInput => ({
  patient, registers: [...new Set(patient.record.map(e => e.register))], freeText: '', navigator: null,
})

export const selectedEntries = ({ patient, registers }: Pick<ExtractionInput, 'patient' | 'registers'>) =>
  patient.record.filter(entry => registers.includes(entry.register))

// Boundary to the NLP provider. The production implementation calls the Wolters Kluwer
// Expert AI API with the selected texts, the fixed HASHTAG_IDS and the constraint ids.
export type PatientExtractor = (input: ExtractionInput, now: Date) => Promise<Extraction>

const NEGATION = /(^|\s)(ei|eikä|ilman)\s/i

const CONSTRAINT_STEMS: Record<Exclude<ConstraintId, 'older'>, string[]> = {
  mobility: ['oma auto puuttuu', 'rollaattori', 'pyörätuoli', 'liikkumisvaike', 'joukkoliikenteessä'],
  working: ['työskentelee', 'työstressi', 'kokopäivä', 'vuorotyö'],
  studying: ['opinno', 'opiskel'],
  lowIncome: ['taloudellinen tilanne tiukka', 'toimeentulotuki', 'pienituloi', 'työttömy'],
}

export const sentences = (input: ExtractionInput): string[] =>
  [...selectedEntries(input).map(entry => entry.text), input.freeText]
    .flatMap(text => text.split(/(?<=[.!?])\s+/))
    .filter(s => s.trim() !== '')

const findSentence = (all: string[], stems: readonly string[]) =>
  all.find(s => stems.some(stem => s.toLowerCase().includes(stem)))

export const ageTags = (age: number): ExtractedTag[] => {
  const evidence = `Ikä ${age} v (henkilötunnus)`
  return [
    ...(age >= 65 ? [{ id: 'ikaantyneet' as const, evidence }] : []),
    ...(age >= 18 && age <= 29 ? [{ id: 'nuoret' as const, evidence }] : []),
  ]
}

// Keyword-stem stand-in for the WK Expert AI API, good enough for synthetic demo data
export const mockExtractor: PatientExtractor = async (input, now) => {
  const { patient, navigator } = input
  const all = sentences(input)
  const affirmed = all.filter(s => !NEGATION.test(s))
  const age = ageAt(patient.hetu, now)

  const textTags = HASHTAG_IDS.flatMap(id => {
    const hit = findSentence(affirmed, HASHTAGS[id].stems)
    return hit ? [{ id, evidence: hit }] : []
  })
  // Constraint cues are often phrased negatively ("oma auto puuttuu"), so all sentences count
  const constraints = (Object.keys(CONSTRAINT_STEMS) as (keyof typeof CONSTRAINT_STEMS)[]).flatMap(id => {
    const hit = findSentence(all, CONSTRAINT_STEMS[id])
    return hit ? [{ id, evidence: hit }] : []
  })

  return {
    tags: [...textTags, ...navigatorTags(navigator, textTags), ...ageTags(age)],
    constraints: [...constraints, ...olderConstraint(age)],
    source: 'mock',
  }
}

// Navigator answers add the tags the texts did not already give
export const navigatorTags = (navigator: NavigatorResult | null, found: ExtractedTag[]): ExtractedTag[] =>
  (navigator?.tags ?? [])
    .filter(id => !found.some(t => t.id === id))
    .map(id => ({ id, evidence: `${NAVIGATORS[navigator!.navigator].name} ${navigator!.code}` }))

export const olderConstraint = (age: number): ExtractedConstraint[] =>
  age >= 65 ? [{ id: 'older', evidence: `Ikä ${age} v (henkilötunnus)` }] : []

// Falls back to the keyword extractor when the language model cannot run (no WebGPU, download fails)
export const withFallback = (primary: PatientExtractor, fallback: PatientExtractor): PatientExtractor =>
  async (input, now) => {
    const runId = debug.currentRun()
    try {
      return await primary(input, now)
    } catch (error) {
      console.warn('Language model extraction failed, using keywords', error)
      debug.stage('Fallback to keywords', { error: error instanceof Error ? error.message : String(error) }, undefined, runId)
      return { ...(await fallback(input, now)), source: 'mock (fallback)' }
    }
  }
