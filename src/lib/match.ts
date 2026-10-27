import type { GroupListing } from '../data/groups'
import type { HashtagId } from '../data/hashtags'
import { isEligible, type Candidate } from './eligibility'
import type { Fit, Judgment, PatientProfile, SessionPreference } from './extraction'
import { distanceKm, type Coords } from './geo'

export type Match = {
  group: GroupListing
  score: number
  matched: HashtagId[]
  distanceKm: number | null
  // null when the organiser publishes no seat counts
  seatsLeft: number | null
  // Set by semanticRank: the factors that scaled the tag score
  adjustments?: Adjustment[]
}

// Why a match was moved down (or confirmed) after tag matching
export type Adjustment =
  | { kind: 'fit'; fit: Fit; reason: string; weight: number }
  | { kind: 'session'; preference: Exclude<SessionPreference, 'none'>; weight: number }
  | { kind: 'ageGroup'; target: 'ikaantyneet' | 'nuoret'; weight: number }

export const serviceKey = (group: GroupListing) => group.serviceId ?? group.id

// Inverse document frequency over the listing corpus: rare tags carry more information.
// A service listed once per location counts once.
export const idfWeights = (groups: GroupListing[]): Map<HashtagId, number> => {
  const services = [...new Map(groups.map(g => [serviceKey(g), g])).values()]
  const counts = services
    .flatMap(g => g.tags)
    .reduce((acc, tag) => acc.set(tag, (acc.get(tag) ?? 0) + 1), new Map<HashtagId, number>())
  return new Map([...counts].map(([tag, df]) => [tag, Math.log(services.length / df) + 1]))
}

const seatsLeft = ({ capacity, enrolled, status }: GroupListing): number | null =>
  capacity !== null && enrolled !== null ? Math.max(0, capacity - enrolled) : status === 'full' ? 0 : null

const farther = (a: Match, b: Match) => (a.distanceKm ?? Infinity) > (b.distanceKm ?? Infinity)

const nearestPerService = (matches: Match[]): Match[] => [
  ...matches
    .reduce((best, m) => {
      const current = best.get(serviceKey(m.group))
      return current && !farther(current, m) ? best : best.set(serviceKey(m.group), m)
    }, new Map<string, Match>())
    .values(),
]

const located = (group: GroupListing, from: Coords | null) => ({
  group,
  distanceKm: from && group.coords ? distanceKm(from, group.coords) : null,
  seatsLeft: seatsLeft(group),
})

const norm = (tags: HashtagId[], idf: Map<HashtagId, number>) =>
  Math.sqrt(tags.reduce((sum, t) => sum + (idf.get(t) ?? 0) ** 2, 0))

// Cosine similarity between IDF-weighted binary tag vectors
export const fitScore = (
  patientTags: HashtagId[],
  groupTags: HashtagId[],
  idf: Map<HashtagId, number>,
): { score: number; matched: HashtagId[] } => {
  const matched = groupTags.filter(t => patientTags.includes(t))
  const denominator = norm(patientTags, idf) * norm(groupTags, idf)
  const dot = matched.reduce((sum, t) => sum + (idf.get(t) ?? 0) ** 2, 0)
  return { score: denominator === 0 ? 0 : dot / denominator, matched }
}

// With a candidate, groups whose inclusion criteria rule the patient out are left out
export const rankGroups = (
  patientTags: HashtagId[],
  home: Coords,
  groups: GroupListing[],
  candidate?: Omit<Candidate, 'tags'>,
): Match[] => {
  const idf = idfWeights(groups)
  const matches = groups
    .filter(group => !candidate || isEligible(group.eligibility, { ...candidate, tags: patientTags }))
    .map(group => ({ ...located(group, home), ...fitScore(patientTags, group.tags, idf) }))
    .filter(m => m.score > 0)
  return nearestPerService(matches).sort(byRank)
}

// Groups with seats first, then by score, then the nearest
export const byRank = (a: Match, b: Match) =>
  Number(b.seatsLeft !== 0) - Number(a.seatsLeft !== 0) ||
  b.score - a.score ||
  (a.distanceKm ?? 0) - (b.distanceKm ?? 0)

const FIT_WEIGHTS: Record<Fit, number> = { yes: 1, partly: 0.7, no: 0.3 }
const AGE_GROUP_WEIGHT = 0.5
const OLDER_FROM = 65
const YOUNG_ADULT_UNTIL = 29

// A hybrid service without a mapped site is only reachable remotely, like the card shows it
const isRemote = (group: GroupListing) =>
  group.format !== 'inPerson' && (group.format !== 'hybrid' || group.coords === null)

const sessionWeight = (group: GroupListing, preference: SessionPreference): number =>
  preference === 'inPerson' ? (isRemote(group) ? 0.5 : group.format === 'hybrid' ? 0.9 : 1)
  : preference === 'remote' ? (group.format === 'inPerson' ? 0.6 : 1)
  : 1

const adjustmentsFor = (
  group: GroupListing,
  { age, profile, judgments }: SemanticContext,
): Adjustment[] => {
  const judgment = judgments?.[serviceKey(group)]
  const preference = profile?.sessionPreference ?? 'none'
  const session = sessionWeight(group, preference)
  return [
    ...(judgment ? [{ kind: 'fit' as const, ...judgment, weight: FIT_WEIGHTS[judgment.fit] }] : []),
    ...(preference !== 'none' && session < 1 ? [{ kind: 'session' as const, preference, weight: session }] : []),
    ...(group.tags.includes('ikaantyneet') && age < OLDER_FROM
      ? [{ kind: 'ageGroup' as const, target: 'ikaantyneet' as const, weight: AGE_GROUP_WEIGHT }] : []),
    ...(group.tags.includes('nuoret') && age > YOUNG_ADULT_UNTIL
      ? [{ kind: 'ageGroup' as const, target: 'nuoret' as const, weight: AGE_GROUP_WEIGHT }] : []),
  ]
}

export type SemanticContext = { age: number; profile?: PatientProfile; judgments?: Record<string, Judgment> }

// Second stage after tag matching: scales each score by how well the service's target group,
// age group and session type suit this patient, then re-sorts
export const semanticRank = (matches: Match[], context: SemanticContext): Match[] =>
  matches
    .map(m => {
      const adjustments = adjustmentsFor(m.group, context)
      const weight = adjustments.reduce((w, a) => w * a.weight, 1)
      return { ...m, score: m.score * weight, adjustments }
    })
    .sort(byRank)

// Browsing without a patient: no fit score. With a reference point each service keeps its nearest
// site; without one there is no nearest, so every site is listed and nothing has a distance.
export const browseGroups = (from: Coords | null, groups: GroupListing[]): Match[] => {
  const matches = groups.map(group => ({ ...located(group, from), score: 0, matched: [] }))
  return from ? nearestPerService(matches) : matches
}
