import type { GroupListing } from '../data/groups'
import type { Match } from '../lib/match'
import { DICTS, formatDate, formatTime, type Lang } from '../i18n'

const weeklySlot = ({ weekday, startTime, endTime }: GroupListing, lang: Lang) =>
  weekday !== null && startTime !== null && endTime !== null
    ? `${DICTS[lang].weekdays[weekday - 1]} ${formatTime(startTime, lang)}–${formatTime(endTime, lang)}`
    : null

export const scheduleText = (group: GroupListing, lang: Lang) => weeklySlot(group, lang) ?? group.scheduleNote ?? ''

// Start date, weekly slot and session count, leaving out whatever the organiser does not publish
export const scheduleLine = (group: GroupListing, lang: Lang, withSessions = false) =>
  [
    group.startDate && `${DICTS[lang].starts} ${formatDate(group.startDate, lang)}`,
    scheduleText(group, lang),
    withSessions && group.sessions !== null && DICTS[lang].sessions(group.sessions),
  ].filter(Boolean).join(' · ')

// Without a reference point only remote listings say anything about their place
export const remoteText = (group: GroupListing, lang: Lang) => (group.format !== 'inPerson' ? DICTS[lang].remote : '')

export const distanceText = (group: GroupListing, distanceKm: number | null, lang: Lang) =>
  distanceKm !== null
    ? DICTS[lang].km(distanceKm)
    : group.format !== 'inPerson' ? DICTS[lang].remote : DICTS[lang].locationUnknown

export const seatsText = ({ group, seatsLeft }: Match, lang: Lang) =>
  seatsLeft !== null ? DICTS[lang].seatsLeft(seatsLeft) : DICTS[lang].enrolment[group.status ?? 'unknown']

export const languagesText = (group: GroupListing) => group.languages.join(' / ').toUpperCase()
