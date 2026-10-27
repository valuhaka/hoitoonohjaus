// Finnish labels for the exports in this folder
import type { EnrolmentStatus, Gender, Lang, SessionType, TreatmentKind, TreatmentListing } from '../src/data/treatments.ts'

export const STATUS_LABELS: Record<EnrolmentStatus, string> = {
  dropIn: 'Ilman ilmoittautumista',
  continuous: 'Jatkuva',
  applyNow: 'Haku auki',
  applyLater: 'Haku myöhemmin',
  registrationClosed: 'Ilmoittautuminen päättynyt',
  inProgress: 'Ryhmä käynnissä',
  full: 'Täynnä',
  referral: 'Lähetteellä',
  unknown: 'Ei tietoa',
}

export const SESSION_LABELS: Record<SessionType, string> = {
  inPerson: 'Paikan päällä',
  hybrid: 'Hybridi',
  video: 'Video',
  phone: 'Puhelin',
  chat: 'Chat / kirjoittaen',
  online: 'Verkko-ohjelma',
}

export const KIND_LABELS: Record<TreatmentKind, string> = {
  group: 'Ryhmähoito',
  peerGroup: 'Vertaistukiryhmä',
  individual: 'Yksilöhoito',
  dropIn: 'Matalan kynnyksen keskusteluapu',
  helpline: 'Auttava puhelin',
  chat: 'Chat',
  online: 'Nettiterapia',
  selfCare: 'Omahoito',
  organisation: 'Järjestö',
  specialist: 'Erikoissairaanhoito',
}

export const GENDER_LABELS: Record<Gender, string> = { male: 'mies', female: 'nainen', other: 'muu' }

export const LANG_LABELS: Record<Lang, string> = { fi: 'suomi', sv: 'ruotsi', en: 'englanti', ru: 'venäjä' }

export const genders = (t: TreatmentListing) =>
  t.genders.length === 3 ? 'kaikki' : t.genders.map(g => GENDER_LABELS[g]).join(', ')
