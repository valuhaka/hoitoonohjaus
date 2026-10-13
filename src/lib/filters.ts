import type { ExtractedConstraint } from './extraction'
import type { Match } from './match'

export type TimeOfDay = 'any' | 'daytime' | 'evening'

export type Filters = {
  startsWithinDays: number | null
  timeOfDay: TimeOfDay
  // 0 = free only
  maxFee: number | null
  maxDistanceKm: number | null
}

export const NO_FILTERS: Filters = { startsWithinDays: null, timeOfDay: 'any', maxFee: null, maxDistanceKm: null }

// Groups starting at or after this hour count as evening groups
const EVENING_FROM_HOUR = 16
const DAY_MS = 24 * 60 * 60 * 1000

export const isActive = (filters: Filters): boolean =>
  JSON.stringify(filters) !== JSON.stringify(NO_FILTERS)

const startsInTime = (startDate: string, withinDays: number | null, now: Date) =>
  withinDays === null || new Date(startDate).getTime() - now.getTime() <= withinDays * DAY_MS

const atTimeOfDay = (startTime: string, timeOfDay: TimeOfDay) => {
  const evening = Number(startTime.slice(0, 2)) >= EVENING_FROM_HOUR
  return timeOfDay === 'any' || (timeOfDay === 'evening') === evening
}

// Remote groups have no distance and always pass the distance filter
const withinDistance = (distanceKm: number | null, max: number | null) =>
  max === null || distanceKm === null || distanceKm <= max

export const applyFilters = (matches: Match[], filters: Filters, now: Date): Match[] =>
  matches.filter(
    ({ group, distanceKm }) =>
      startsInTime(group.startDate, filters.startsWithinDays, now) &&
      atTimeOfDay(group.startTime, filters.timeOfDay) &&
      (filters.maxFee === null || group.fee <= filters.maxFee) &&
      withinDistance(distanceKm, filters.maxDistanceKm),
  )

export type FilterGuess = { filters: Filters; reasons: Partial<Record<keyof Filters, string>> }

const GUESSED_MAX_DISTANCE_KM = 25
const GUESSED_MAX_FEE = 10

// Suggest filters from practical constraints; each suggestion keeps its evidence sentence
export const guessFilters = (constraints: ExtractedConstraint[]): FilterGuess => {
  const find = (id: ExtractedConstraint['id']) => constraints.find(c => c.id === id)
  const mobility = find('mobility')
  const busyDays = find('working') ?? find('studying')
  const timeCue = busyDays ?? find('older')
  const lowIncome = find('lowIncome')

  return {
    filters: {
      ...NO_FILTERS,
      maxDistanceKm: mobility ? GUESSED_MAX_DISTANCE_KM : null,
      timeOfDay: busyDays ? 'evening' : timeCue ? 'daytime' : 'any',
      maxFee: lowIncome ? GUESSED_MAX_FEE : null,
    },
    reasons: {
      ...(mobility && { maxDistanceKm: mobility.evidence }),
      ...(timeCue && { timeOfDay: timeCue.evidence }),
      ...(lowIncome && { maxFee: lowIncome.evidence }),
    },
  }
}
