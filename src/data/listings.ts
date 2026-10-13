import { GROUPS, type GroupListing } from './groups'
import { TREATMENTS, type TreatmentKind, type TreatmentListing, type TreatmentLocation } from './treatments'

export type DataSource = 'synthetic' | 'real'

// Listing data, so it stays in Finnish like the organisers' own texts
const KIND_LABELS: Record<TreatmentKind, string> = {
  group: 'Ryhmähoito',
  peerGroup: 'Vertaisryhmä',
  individual: 'Yksilötapaamiset',
  dropIn: 'Matalan kynnyksen keskusteluapu',
  helpline: 'Auttava puhelin',
  chat: 'Chat',
  online: 'Nettiterapia',
  selfCare: 'Omahoito',
  organisation: 'Järjestö',
  specialist: 'Erikoispalvelu',
}

const hostname = (url: string) => new URL(url).hostname.replace(/^www\./, '')

const toListing = (t: TreatmentListing, location: TreatmentLocation | null, id: string): GroupListing => {
  const weekly = t.timetable?.weekly ?? []
  const slot = weekly.length === 1 ? weekly[0]! : null
  // A shared start time still tells day groups from evening groups
  const sharedStart = weekly.length > 0 && weekly.every(s => s.start === weekly[0]!.start) ? weekly[0]!.start : null
  const scheduleNote = location?.hours ?? t.timetable?.text
  const remote = t.format === 'remote' || (t.format === 'hybrid' && !location?.coords)
  return {
    id,
    serviceId: t.id,
    name: t.name,
    organiser: t.organiser,
    method: KIND_LABELS[t.kind],
    format: remote ? 'remote' : 'inPerson',
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
    booking: { type: 'external', system: hostname(t.contact.url), url: t.contact.url },
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

export const LISTINGS: Record<DataSource, GroupListing[]> = { synthetic: GROUPS, real: REAL_GROUPS }
