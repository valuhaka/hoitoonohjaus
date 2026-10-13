import { HASHTAGS, HASHTAG_IDS, type HashtagId } from '../data/hashtags'
import type { Patient } from '../data/patients'
import { ageAt } from './hetu'

export type ExtractedTag = { id: HashtagId; evidence: string }

export type Extraction = { tags: ExtractedTag[]; source: string }

// Boundary to the NLP provider. The production implementation calls the
// Wolters Kluwer Expert AI API with the record text and the fixed HASHTAG_IDS.
export type PatientExtractor = (patient: Patient, now: Date) => Promise<Extraction>

const NEGATION = /(^|\s)(ei|eikä|ilman)\s/i

const sentences = (patient: Patient): string[] =>
  patient.record.flatMap(entry => entry.text.split(/(?<=[.!?])\s+/))

const ageTags = (patient: Patient, now: Date): ExtractedTag[] => {
  const age = ageAt(patient.hetu, now)
  const evidence = `Ikä ${age} v (henkilötunnus)`
  return [
    ...(age >= 65 ? [{ id: 'ikaantyneet' as const, evidence }] : []),
    ...(age >= 18 && age <= 29 ? [{ id: 'nuoret' as const, evidence }] : []),
  ]
}

// Keyword-stem stand-in for the WK Expert AI API, good enough for synthetic demo data
export const mockExtractor: PatientExtractor = async (patient, now) => {
  const affirmed = sentences(patient).filter(s => !NEGATION.test(s))
  const textTags = HASHTAG_IDS.flatMap(id => {
    const hit = affirmed.find(s => HASHTAGS[id].stems.some(stem => s.toLowerCase().includes(stem)))
    return hit ? [{ id, evidence: hit }] : []
  })
  return { tags: [...textTags, ...ageTags(patient, now)], source: 'mock' }
}
