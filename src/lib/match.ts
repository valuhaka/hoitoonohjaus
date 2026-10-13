import type { GroupListing } from '../data/groups'
import type { HashtagId } from '../data/hashtags'
import { distanceKm, type Coords } from './geo'

export type Match = {
  group: GroupListing
  score: number
  matched: HashtagId[]
  distanceKm: number | null
  seatsLeft: number
}

// Inverse document frequency over the listing corpus: rare tags carry more information
export const idfWeights = (groups: GroupListing[]): Map<HashtagId, number> => {
  const counts = groups
    .flatMap(g => g.tags)
    .reduce((acc, tag) => acc.set(tag, (acc.get(tag) ?? 0) + 1), new Map<HashtagId, number>())
  return new Map([...counts].map(([tag, df]) => [tag, Math.log(groups.length / df) + 1]))
}

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

export const rankGroups = (
  patientTags: HashtagId[],
  home: Coords,
  groups: GroupListing[],
): Match[] => {
  const idf = idfWeights(groups)
  return groups
    .map(group => ({
      group,
      ...fitScore(patientTags, group.tags, idf),
      distanceKm: group.coords ? distanceKm(home, group.coords) : null,
      seatsLeft: Math.max(0, group.capacity - group.enrolled),
    }))
    .filter(m => m.score > 0)
    .sort(
      (a, b) =>
        Number(b.seatsLeft > 0) - Number(a.seatsLeft > 0) ||
        b.score - a.score ||
        (a.distanceKm ?? 0) - (b.distanceKm ?? 0),
    )
}
