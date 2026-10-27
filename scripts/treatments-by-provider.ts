// Renders src/data/treatments.ts as a readable Markdown document, one section per provider:
// node scripts/treatments-by-provider.ts > docs/treatments-by-provider.md
import { HASHTAGS } from '../src/data/hashtags.ts'
import { RETRIEVED_AT, TREATMENTS } from '../src/data/treatments.ts'
import type { TreatmentListing } from '../src/data/treatments.ts'
import { genders, KIND_LABELS, LANG_LABELS, SESSION_LABELS, STATUS_LABELS } from './labels.ts'

// Units whose name does not start with their parent's name
const ALIASES: Record<string, string> = {
  'MIELI ry, Itsemurhien ehkäisykeskus': 'MIELI Suomen Mielenterveys ry',
  'Helsingin sosiaali-, terveys- ja pelastustoimi': 'Helsingin kaupunki',
}

const organisers = [...new Set(TREATMENTS.map(t => t.organiser))]

// A unit or programme ("Miessakit ry / MASI", "Helsingin kaupunki, perheneuvola", "EHYT ry – Elokolot")
// goes under its parent when the parent is also listed as an organiser
const JOINTS = [' / ', ', ', ' – ']
const providerOf = (organiser: string) =>
  ALIASES[organiser] ??
  organisers
    .filter(parent => JOINTS.some(joint => organiser.startsWith(parent + joint)))
    .sort((a, b) => a.length - b.length)[0] ??
  organiser

const byFinnish = (a: string, b: string) => a.localeCompare(b, 'fi')

const providers = [...TREATMENTS.reduce(
  (groups, t) => groups.set(providerOf(t.organiser), [...(groups.get(providerOf(t.organiser)) ?? []), t]),
  new Map<string, TreatmentListing[]>(),
)].sort(([a], [b]) => byFinnish(a, b))

// Matches GitHub's heading anchors
const slug = (heading: string) => heading.toLowerCase().replace(/[^\p{L}\p{N} -]/gu, '').replace(/ /g, '-')

const price = ({ price: { fee, note } }: TreatmentListing) =>
  fee === null ? note : fee === 0 ? (note.startsWith('Maksuton') ? note : `Maksuton. ${note}`) : `${fee} € – ${note}`

const where = (t: TreatmentListing) =>
  t.locations.length === 0
    ? []
    : t.locations.length === 1
      ? [`**Missä:** ${t.locations[0]!.name}, ${t.locations[0]!.address}${t.locations[0]!.hours ? ` (${t.locations[0]!.hours})` : ''}`]
      : ['**Missä:**', ...t.locations.map(l => `  - ${l.name}, ${l.address}${l.hours ? ` (${l.hours})` : ''}`)]

const enrolment = ({ vacancy: v }: TreatmentListing) =>
  [STATUS_LABELS[v.status], v.capacity !== null && `paikkoja ${v.capacity}, varattu ${v.enrolled ?? '?'}`, v.note]
    .filter(Boolean).join('. ')

const contact = ({ contact: c, locations }: TreatmentListing) => {
  const phones = [...new Set([c.phone, ...locations.map(l => l.phone)].filter(Boolean))]
  return [`[verkkosivu](${c.url})`, ...phones, c.email, c.note].filter(Boolean).join(' · ')
}

// The unit or programme name without the provider repeated in front
const unit = (organiser: string, provider: string) => {
  const joint = JOINTS.find(j => organiser.startsWith(provider + j))
  return organiser === provider ? null : joint ? organiser.slice(provider.length + joint.length) : organiser
}

const field = (label: string, value: string | false | null | undefined) => (value ? [`**${label}:** ${value}`] : [])

const entry = (provider: string) => (t: TreatmentListing) => [
  `### ${t.name}`,
  '',
  t.description,
  '',
  ...[
    ...field('Toiminta tai yksikkö', unit(t.organiser, provider)),
    `**Tyyppi:** ${KIND_LABELS[t.kind]}, ${SESSION_LABELS[t.format].toLowerCase()}`,
    ...field('Kenelle', t.targetGroup),
    ...field('Sukupuoli', t.genders.length < 3 && genders(t)),
    ...field('Aiheet', t.tags.length > 0 ? t.tags.map(id => HASHTAGS[id].fi).join(', ') : t.untaggedReason),
    ...where(t),
    ...field('Milloin', t.timetable?.text),
    `**Hinta:** ${price(t)}`,
    `**Ilmoittautuminen:** ${enrolment(t)}${t.referral ? '. Lähete tarvitaan.' : ''}`,
    `**Kielet:** ${t.languages.map(l => LANG_LABELS[l]).join(', ')}${t.interpreter ? ', tulkki saatavilla' : ''}`,
    `**Yhteystiedot:** ${contact(t)}`,
    `**Lähde:** ${t.sourceUrl}`,
  ].map(line => (line.startsWith('  - ') ? line : `- ${line}`)),
  '',
]

const section = ([provider, treatments]: [string, TreatmentListing[]]) => [
  `## ${provider}`,
  '',
  ...[...treatments].sort((a, b) => byFinnish(a.name, b.name)).flatMap(entry(provider)),
]

const lines = [
  '# Hoitovaihtoehdot palveluntarjoajittain',
  '',
  `${TREATMENTS.length} hoito- ja tukivaihtoehtoa ${providers.length} palveluntarjoajalta. ` +
    `Tiedot on koottu julkisilta verkkosivuilta ${RETRIEVED_AT.split('-').reverse().map(Number).join('.')}. ` +
    'Vapaiden paikkojen määriä ei julkaise mikään lähde; ilmoittautumistilanne kertoo, mitä sivulla luki.',
  '',
  '## Sisällys',
  '',
  ...providers.map(([provider, treatments]) => `- [${provider}](#${slug(provider)}) (${treatments.length})`),
  '',
  ...providers.flatMap(section),
]

console.log(lines.join('\n'))
