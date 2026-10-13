import type { HashtagId } from '../data/hashtags'

// Inclusion criteria of a group listing. The hard criteria (age, residence, exclusions)
// are checked during matching; `referral` and `notes` are shown to the referrer.
// 'required': a referral is needed but the source does not say from whom; 'unknown': not published
export type Referral = 'none' | 'professional' | 'doctor' | 'required' | 'unknown'

export type Eligibility = {
  minAge: number | null
  maxAge: number | null
  // Home municipalities the organiser serves; null = anyone
  municipalities: string[] | null
  referral: Referral
  // Topics that rule a patient out, e.g. active substance use in a trauma group
  excludes: HashtagId[]
  // Other criteria in the organiser's own words
  notes: string[]
}

// Nothing published: nobody is ruled out
export const UNKNOWN_ELIGIBILITY: Eligibility = {
  minAge: null, maxAge: null, municipalities: null, referral: 'unknown', excludes: [], notes: [],
}

export type Candidate = { age: number; municipality: string; tags: HashtagId[] }

export type Ineligibility = 'age' | 'municipality' | 'excluded'

export const LUVN_MUNICIPALITIES = [
  'Espoo', 'Hanko', 'Inkoo', 'Karkkila', 'Kauniainen', 'Kirkkonummi', 'Lohja', 'Raasepori', 'Siuntio', 'Vihti',
]

export const ineligibility = (criteria: Eligibility, candidate: Candidate): Ineligibility[] => [
  ...((criteria.minAge !== null && candidate.age < criteria.minAge) ||
  (criteria.maxAge !== null && candidate.age > criteria.maxAge)
    ? ['age' as const]
    : []),
  ...(criteria.municipalities && !criteria.municipalities.includes(candidate.municipality)
    ? ['municipality' as const]
    : []),
  ...(criteria.excludes.some(tag => candidate.tags.includes(tag)) ? ['excluded' as const] : []),
]

export const isEligible = (criteria: Eligibility, candidate: Candidate): boolean =>
  ineligibility(criteria, candidate).length === 0
