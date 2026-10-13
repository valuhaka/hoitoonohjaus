import type { GroupListing } from '../data/groups'
import { DICTS, formatTime, type Lang } from '../i18n'

export const scheduleText = (group: GroupListing, lang: Lang) =>
  `${DICTS[lang].weekdays[group.weekday - 1]} ${formatTime(group.startTime, lang)}–${formatTime(group.endTime, lang)}`

export const distanceText = (distanceKm: number | null, lang: Lang) =>
  distanceKm === null ? DICTS[lang].remote : DICTS[lang].km(distanceKm)

export const languagesText = (group: GroupListing) => group.languages.join(' / ').toUpperCase()
