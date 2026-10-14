import { UNKNOWN_ELIGIBILITY } from '../lib/eligibility'
import type { GroupListing } from './groups'
import { RETRIEVED_AT, TREATMENTS, type TreatmentListing, type TreatmentLocation } from './treatments'

const hostname = (url: string) => new URL(url).hostname.replace(/^www\./, '')

const toListing = (t: TreatmentListing, location: TreatmentLocation | null, id: string): GroupListing => {
  const weekly = t.timetable?.weekly ?? []
  const slot = weekly.length === 1 ? weekly[0]! : null
  // A shared start time still tells day groups from evening groups
  const sharedStart = weekly.length > 0 && weekly.every(s => s.start === weekly[0]!.start) ? weekly[0]!.start : null
  const scheduleNote = location?.hours ?? t.timetable?.text
  return {
    id,
    serviceId: t.id,
    name: t.name,
    organiser: t.organiser,
    // The sources name no method; the UI words the kind
    method: '',
    kind: t.kind,
    format: t.format,
    genders: t.genders,
    address: location?.address ?? '',
    municipality: location?.municipality ?? '',
    coords: location?.coords ?? null,
    languages: t.languages,
    tags: t.tags,
    capacity: t.vacancy.capacity,
    enrolled: t.vacancy.enrolled,
    status: t.vacancy.status,
    startDate: t.timetable?.startDate ?? null,
    sessions: t.timetable?.sessions ?? null,
    weekday: slot?.weekday ?? null,
    startTime: slot?.start ?? sharedStart,
    endTime: slot?.end ?? null,
    ...(scheduleNote && { scheduleNote }),
    fee: t.price.fee,
    contact: {
      ...((location?.phone ?? t.contact.phone) && { phone: location?.phone ?? t.contact.phone }),
      ...(t.contact.email && { email: t.contact.email }),
    },
    // The sources carry no publication dates; a listing counts as added when it was retrieved
    addedAt: RETRIEVED_AT,
    booking: { type: 'external', system: hostname(t.contact.url), url: t.contact.url },
    // Sources publish no structured criteria; only the referral flag and the target group text
    eligibility: {
      ...UNKNOWN_ELIGIBILITY,
      referral: t.referral === null ? 'unknown' : t.referral ? 'required' : 'none',
      notes: t.targetGroup ? [t.targetGroup] : [],
    },
  }
}

// One listing per mapped location, so matching can offer the nearest site of a multi-site service
export const toGroupListings = (t: TreatmentListing): GroupListing[] => {
  const located = t.locations.filter(l => l.coords)
  if (located.length <= 1) return [toListing(t, located[0] ?? t.locations[0] ?? null, t.id)]
  return located.map((l, i) => toListing(t, l, `${t.id}@${i}`))
}

// Untagged entries can never match, so they stay out of the corpus that sets the tag weights
export const REAL_GROUPS: GroupListing[] = TREATMENTS.filter(t => t.tags.length > 0).flatMap(toGroupListings)


// Browsing needs no tags, so the catalogue also lists the untagged services (psychosis, eating disorders, ...)
export const CATALOGUE: GroupListing[] = TREATMENTS.flatMap(toGroupListings)
