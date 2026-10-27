// Renders src/data/treatments.ts as a spreadsheet for readers outside the team:
// node scripts/treatments-csv.ts > docs/treatments.csv
// Semicolons, CRLF and a byte order mark so Excel in a Finnish locale opens it straight into columns
// with ä and ö intact. Several values in one cell (addresses, phone numbers) go on separate lines.
import { HASHTAGS } from '../src/data/hashtags.ts'
import { TREATMENTS } from '../src/data/treatments.ts'
import type { TreatmentListing } from '../src/data/treatments.ts'
import { genders, KIND_LABELS, LANG_LABELS, SESSION_LABELS, STATUS_LABELS } from './labels.ts'

const SEPARATOR = ';'
const WEEKDAYS = ['', 'ma', 'ti', 'ke', 'to', 'pe', 'la', 'su']

const quote = (value: string) => (/[";\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)
const lines = (values: (string | undefined)[]) => [...new Set(values.filter(Boolean))].join('\n')
const yesNo = (value: boolean | null | undefined) => (value === null || value === undefined ? '' : value ? 'kyllä' : 'ei')
const finnishDate = (iso?: string) => (iso ? iso.split('-').reverse().map(Number).join('.') : '')

const weekly = ({ timetable }: TreatmentListing) =>
  (timetable?.weekly ?? []).map(s => `${WEEKDAYS[s.weekday]} ${s.start}–${s.end}`).join(', ')

const price = ({ price: { fee } }: TreatmentListing) =>
  fee === null ? 'ei tietoa' : fee === 0 ? 'maksuton' : `${String(fee).replace('.', ',')} €`

const seats = ({ vacancy: { capacity, enrolled } }: TreatmentListing) =>
  capacity === null ? '' : `${enrolled ?? '?'} / ${capacity}`

const COLUMNS: [string, (t: TreatmentListing) => string][] = [
  ['Palvelu', t => t.name],
  ['Järjestäjä', t => t.organiser],
  ['Palvelun tyyppi', t => KIND_LABELS[t.kind]],
  ['Toteutus', t => SESSION_LABELS[t.format]],
  ['Kohderyhmä', t => t.targetGroup],
  ['Sukupuoli', genders],
  ['Aiheet', t => t.tags.map(id => HASHTAGS[id].fi).join(', ')],
  ['Miksi ei aiheita', t => t.untaggedReason ?? ''],
  ['Kuvaus', t => t.description],
  ['Paikkakunta', t => lines(t.locations.map(l => l.municipality))],
  ['Toimipiste ja osoite', t => lines(t.locations.map(l => `${l.name}, ${l.address}`))],
  ['Aukioloajat', t => lines(t.locations.map(l => l.hours && `${l.name}: ${l.hours}`))],
  ['Aikataulu', t => t.timetable?.text ?? ''],
  ['Viikoittain', weekly],
  ['Alkaa', t => finnishDate(t.timetable?.startDate)],
  ['Päättyy', t => finnishDate(t.timetable?.endDate)],
  ['Tapaamiskertoja', t => String(t.timetable?.sessions ?? '')],
  ['Hinta', price],
  ['Hinnan lisätiedot', t => t.price.note],
  ['Ilmoittautumistilanne', t => STATUS_LABELS[t.vacancy.status]],
  ['Paikat (varattu / yhteensä)', seats],
  ['Tilanteen lisätiedot', t => t.vacancy.note ?? ''],
  ['Lähete tarvitaan', t => yesNo(t.referral)],
  ['Kielet', t => t.languages.map(l => LANG_LABELS[l]).join(', ')],
  ['Tulkki saatavilla', t => yesNo(t.interpreter)],
  ['Verkkosivu', t => t.contact.url],
  ['Puhelin', t => lines([t.contact.phone, ...t.locations.map(l => l.phone)])],
  ['Sähköposti', t => t.contact.email ?? ''],
  ['Yhteydenoton lisätiedot', t => t.contact.note ?? ''],
  ['Tietolähde', t => t.sourceUrl],
]

const row = (values: string[]) => values.map(quote).join(SEPARATOR)

process.stdout.write('﻿' + [
  row(COLUMNS.map(([header]) => header)),
  ...TREATMENTS.map(t => row(COLUMNS.map(([, value]) => value(t)))),
].join('\r\n') + '\r\n')
