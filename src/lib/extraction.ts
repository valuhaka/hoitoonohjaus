import { HASHTAGS, HASHTAG_IDS, type HashtagId } from '../data/hashtags'
import type { Patient } from '../data/patients'
import { ageAt } from './hetu'

export type ExtractedTag = { id: HashtagId; evidence: string }

// Practical circumstances that shape which groups are realistic, not what to treat
export type ConstraintId = 'mobility' | 'working' | 'studying' | 'lowIncome' | 'older'
export type ExtractedConstraint = { id: ConstraintId; evidence: string }

export type Extraction = { tags: ExtractedTag[]; constraints: ExtractedConstraint[]; source: string }

// Boundary to the NLP provider. The production implementation calls the
// Wolters Kluwer Expert AI API with the record text, the fixed HASHTAG_IDS and the constraint ids.
export type PatientExtractor = (patient: Patient, now: Date) => Promise<Extraction>

const NEGATION = /(^|\s)(ei|eikä|ilman)\s/i

const CONSTRAINT_STEMS: Record<Exclude<ConstraintId, 'older'>, string[]> = {
  mobility: ['oma auto puuttuu', 'rollaattori', 'pyörätuoli', 'liikkumisvaike', 'joukkoliikenteessä'],
  working: ['työskentelee', 'työstressi', 'kokopäivä', 'vuorotyö'],
  studying: ['opinno', 'opiskel'],
  lowIncome: ['taloudellinen tilanne tiukka', 'toimeentulotuki', 'pienituloi', 'työttömy'],
}

const sentences = (patient: Patient): string[] =>
  patient.record.flatMap(entry => entry.text.split(/(?<=[.!?])\s+/))

const findSentence = (all: string[], stems: readonly string[]) =>
  all.find(s => stems.some(stem => s.toLowerCase().includes(stem)))

const ageTags = (age: number): ExtractedTag[] => {
  const evidence = `Ikä ${age} v (henkilötunnus)`
  return [
    ...(age >= 65 ? [{ id: 'ikaantyneet' as const, evidence }] : []),
    ...(age >= 18 && age <= 29 ? [{ id: 'nuoret' as const, evidence }] : []),
  ]
}

// Keyword-stem stand-in for the WK Expert AI API, good enough for synthetic demo data
export const mockExtractor: PatientExtractor = async (patient, now) => {
  const all = sentences(patient)
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
  const older = age >= 65 ? [{ id: 'older' as const, evidence: `Ikä ${age} v (henkilötunnus)` }] : []

  return { tags: [...textTags, ...ageTags(age)], constraints: [...constraints, ...older], source: 'mock' }
}
