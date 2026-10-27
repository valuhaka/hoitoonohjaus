// Renders src/data/treatments.ts as a Markdown table: node scripts/treatments-table.ts > docs/treatments.md
import { HASHTAGS } from '../src/data/hashtags.ts'
import { RETRIEVED_AT, SOURCES_WITHOUT_LISTINGS, TREATMENTS } from '../src/data/treatments.ts'
import type { Media, TreatmentListing } from '../src/data/treatments.ts'
import { genders, SESSION_LABELS, STATUS_LABELS } from './labels.ts'

const NOT_PUBLISHED = '–'
const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\n/g, ' ')

const location = (t: TreatmentListing) =>
  t.locations.length === 0
    ? (t.format !== 'inPerson' && t.format !== 'hybrid' ? 'Etä' : NOT_PUBLISHED)
    : t.locations.map(l => l.address).join('<br>')

const vacancy = ({ vacancy: v }: TreatmentListing) => {
  const seats = v.capacity === null ? NOT_PUBLISHED : `${v.enrolled ?? '?'} / ${v.capacity}`
  return [seats, STATUS_LABELS[v.status], v.note].filter(Boolean).join('<br>')
}

const mediaLink = (m: Media) => `[${m.caption}](${m.url})`
const buildingAndMedia = (t: TreatmentListing) => {
  const buildings = t.locations.filter(l => l.building).map(l => `**${l.name}:** ${l.building}`)
  const media = [...t.locations.flatMap(l => l.media ?? []), ...t.media].map(mediaLink)
  return [...buildings, ...media].join('<br>') || NOT_PUBLISHED
}

const tags = (t: TreatmentListing) =>
  t.tags.length > 0 ? t.tags.map(id => `#${id}`).join(' ') : `_${t.untaggedReason}_`

const HEADER = ['Palvelu', 'Järjestäjä', 'Toteutus', 'Sukupuoli', 'Sijainti', 'Aikataulu', 'Hinta', 'Paikat (varattu / yht.) ja tilanne', 'Kielet', 'Kuvaus', 'Rakennus, kuvat ja esitteet', 'Hashtagit']

const row = (t: TreatmentListing) => [
  `[${t.name}](${t.contact.url})`,
  t.organiser,
  SESSION_LABELS[t.format],
  genders(t),
  location(t),
  t.timetable?.text ?? NOT_PUBLISHED,
  t.price.fee ? `${t.price.fee} € – ${t.price.note}` : t.price.note,
  vacancy(t),
  t.languages.join(', ') + (t.interpreter ? ' + tulkki' : ''),
  `${t.description} _Kohderyhmä: ${t.targetGroup}._${t.referral ? ' **Lähete tarvitaan.**' : ''}`,
  buildingAndMedia(t),
  tags(t),
].map(cell)

const tagCounts = Object.keys(HASHTAGS)
  .map(id => `| #${id} | ${HASHTAGS[id as keyof typeof HASHTAGS].fi} | ${TREATMENTS.filter(t => t.tags.includes(id as keyof typeof HASHTAGS)).length} |`)

const lines = [
  '# Hoitovaihtoehdot',
  '',
  `Generoitu tiedostosta \`src/data/treatments.ts\` (tiedot haettu ${RETRIEVED_AT}). ${TREATMENTS.length} vaihtoehtoa.`,
  '',
  '"–" = lähde ei julkaise tietoa. Yksikään lähde ei julkaise reaaliaikaisia vapaiden paikkojen määriä; tilanne-sarake kertoo, mitä sivulla lukee.',
  '',
  `| ${HEADER.join(' | ')} |`,
  `| ${HEADER.map(() => '---').join(' | ')} |`,
  ...TREATMENTS.map(t => `| ${row(t).join(' | ')} |`),
  '',
  '## Hashtagien kattavuus',
  '',
  '| Hashtag | Nimi | Vaihtoehtoja |',
  '| --- | --- | --- |',
  ...tagCounts,
  '',
  '## Lähteet, joista ei syntynyt omia rivejä',
  '',
  ...Object.entries(SOURCES_WITHOUT_LISTINGS).map(([url, reason]) => `- ${url}: ${reason}`),
  '',
]

console.log(lines.join('\n'))
