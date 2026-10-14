import type { GroupListing } from '../data/groups'
import type { HashtagId } from '../data/hashtags'
import { isEligible, type Candidate } from './eligibility'
import { distanceKm, type Coords } from './geo'

export type Match = {
  group: GroupListing
  score: number
  matched: HashtagId[]
  distanceKm: number | null
  // null when the organiser publishes no seat counts
  seatsLeft: number | null
}

const serviceKey = (group: GroupListing) => group.serviceId ?? group.id

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
  return nearestPerService(matches)
    .sort(
      (a, b) =>
        Number(b.seatsLeft !== 0) - Number(a.seatsLeft !== 0) ||
        b.score - a.score ||
        (a.distanceKm ?? 0) - (b.distanceKm ?? 0),
    )
}

// Browsing without a patient: no fit score. With a reference point each service keeps its nearest
// site; without one there is no nearest, so every site is listed and nothing has a distance.
export const browseGroups = (from: Coords | null, groups: GroupListing[]): Match[] => {
  const matches = groups.map(group => ({ ...located(group, from), score: 0, matched: [] }))
  return from ? nearestPerService(matches) : matches
}
