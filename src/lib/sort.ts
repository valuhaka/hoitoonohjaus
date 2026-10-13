import type { Match } from './match'

// Orders for browsing; browsing computes no fit, so there is no "best fit" order
export type SortOrder = 'nearest' | 'farthest' | 'cheapest' | 'priciest' | 'nameAsc' | 'nameDesc'
export const SORT_ORDERS: SortOrder[] = ['nearest', 'farthest', 'cheapest', 'priciest', 'nameAsc', 'nameDesc']

// Unknown values (remote groups, unpublished fees) go last in either direction
const byValue = (a: number | null, b: number | null, direction: 1 | -1) =>
  a === null ? (b === null ? 0 : 1) : b === null ? -1 : (a - b) * direction

const byName = (locale: string) => (a: Match, b: Match) => a.group.name.localeCompare(b.group.name, locale)

export const sortMatches = (matches: Match[], order: SortOrder, locale: string): Match[] => {
  const name = byName(locale)
  const compare: (a: Match, b: Match) => number = {
    nearest: (a: Match, b: Match) => byValue(a.distanceKm, b.distanceKm, 1),
    farthest: (a: Match, b: Match) => byValue(a.distanceKm, b.distanceKm, -1),
    cheapest: (a: Match, b: Match) => byValue(a.group.fee, b.group.fee, 1),
    priciest: (a: Match, b: Match) => byValue(a.group.fee, b.group.fee, -1),
    nameAsc: name,
    nameDesc: (a: Match, b: Match) => name(b, a),
  }[order]
  return [...matches].sort((a, b) => compare(a, b) || name(a, b))
}

// Most recently added first; listings without a date go last
export const newestFirst = (matches: Match[], locale: string): Match[] => {
  const name = byName(locale)
  return [...matches].sort((a, b) => (b.group.addedAt ?? '').localeCompare(a.group.addedAt ?? '') || name(a, b))
}
