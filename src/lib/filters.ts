import type { GroupListing } from '../data/groups'
import type { Gender, SessionType } from '../data/treatments'
import type { Evidence, ExtractedConstraint } from './extraction'
import type { Match } from './match'

export type TimeOfDay = 'any' | 'daytime' | 'evening'
// 'remote' covers every session type that does not require coming on site
export type SessionFilter = 'any' | 'remote' | SessionType
export const SESSION_FILTERS: SessionFilter[] = ['any', 'inPerson', 'remote', 'hybrid', 'video', 'phone', 'chat', 'online']

// A min–max range as set by a two-handle slider; max null = no upper limit
export type Range = { min: number; max: number | null }

export type Filters = {
  startsWithinDays: number | null
  timeOfDay: TimeOfDay
  // Euros per session
  fee: Range
  distanceKm: Range
  session: SessionFilter
  gender: Gender | 'any'
}

// Slider scales; the top of each scale means "no upper limit"
export type Scale = { max: number; step: number }
export const DISTANCE_SCALE: Scale = { max: 100, step: 1 }

// The fee scale tops out at the highest fee among the listings
export const feeScale = (groups: GroupListing[]): Scale => ({
  max: Math.max(0, ...groups.map(g => g.fee ?? 0)),
  step: 1,
})

const ANY: Range = { min: 0, max: null }
export const NO_FILTERS: Filters = {
  startsWithinDays: null, timeOfDay: 'any', fee: ANY, distanceKm: ANY, session: 'any', gender: 'any',
}

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

// A hybrid service can be attended both on site and remotely
const offersSession = (format: SessionType, session: SessionFilter) =>
  session === 'any' ||
  format === session ||
  (session === 'inPerson' && format === 'hybrid') ||
  (session === 'remote' && format !== 'inPerson')

const servesGender = (genders: Gender[], gender: Filters['gender']) => gender === 'any' || genders.includes(gender)

export const applyFilters = (matches: Match[], filters: Filters, now: Date): Match[] =>
  matches.filter(
    ({ group, distanceKm }) =>
      startsInTime(group, filters.startsWithinDays, now) &&
      atTimeOfDay(group.startTime, filters.timeOfDay) &&
      (group.fee === null || inRange(group.fee, filters.fee)) &&
      withinDistance(distanceKm, filters.distanceKm) &&
      offersSession(group.format, filters.session) &&
      servesGender(group.genders, filters.gender),
  )

export type FilterGuess = { filters: Filters; reasons: Partial<Record<keyof Filters, Evidence>> }

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
