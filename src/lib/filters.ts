import type { GroupListing } from '../data/groups'
import type { ExtractedConstraint } from './extraction'
import type { Match } from './match'

export type TimeOfDay = 'any' | 'daytime' | 'evening'

// A min–max range as set by a two-handle slider; max null = no upper limit
export type Range = { min: number; max: number | null }

export type Filters = {
  startsWithinDays: number | null
  timeOfDay: TimeOfDay
  // Euros per session
  fee: Range
  distanceKm: Range
}

// Slider scales; the top of each scale means "no upper limit"
export const FEE_SCALE = { max: 30, step: 1 }
export const DISTANCE_SCALE = { max: 100, step: 5 }

const ANY: Range = { min: 0, max: null }
export const NO_FILTERS: Filters = { startsWithinDays: null, timeOfDay: 'any', fee: ANY, distanceKm: ANY }

export const inRange = (value: number, { min, max }: Range) => value >= min && (max === null || value <= max)

// Groups starting at or after this hour count as evening groups
const EVENING_FROM_HOUR = 16
const DAY_MS = 24 * 60 * 60 * 1000

export const isActive = (filters: Filters): boolean =>
  JSON.stringify(filters) !== JSON.stringify(NO_FILTERS)

// Unknown values pass: a listing is only filtered out on what its organiser actually publishes.
// The exception is a group whose next intake is announced for later without a date.
const startsInTime = ({ startDate, status }: GroupListing, withinDays: number | null, now: Date) =>
  withinDays === null ||
  (startDate === null
    ? status !== 'applyLater'
    : new Date(startDate).getTime() - now.getTime() <= withinDays * DAY_MS)

const atTimeOfDay = (startTime: string | null, timeOfDay: TimeOfDay) => {
  if (timeOfDay === 'any' || startTime === null) return true
  const evening = Number(startTime.slice(0, 2)) >= EVENING_FROM_HOUR
  return (timeOfDay === 'evening') === evening
}

// Remote groups have no distance and always pass the distance filter
const withinDistance = (distanceKm: number | null, range: Range) =>
  distanceKm === null || inRange(distanceKm, range)

export const applyFilters = (matches: Match[], filters: Filters, now: Date): Match[] =>
  matches.filter(
    ({ group, distanceKm }) =>
      startsInTime(group, filters.startsWithinDays, now) &&
      atTimeOfDay(group.startTime, filters.timeOfDay) &&
      (group.fee === null || inRange(group.fee, filters.fee)) &&
      withinDistance(distanceKm, filters.distanceKm),
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
      distanceKm: { min: 0, max: mobility ? GUESSED_MAX_DISTANCE_KM : null },
      timeOfDay: busyDays ? 'evening' : timeCue ? 'daytime' : 'any',
      fee: { min: 0, max: lowIncome ? GUESSED_MAX_FEE : null },
    },
    reasons: {
      ...(mobility && { distanceKm: mobility.evidence }),
      ...(timeCue && { timeOfDay: timeCue.evidence }),
      ...(lowIncome && { fee: lowIncome.evidence }),
    },
  }
}
