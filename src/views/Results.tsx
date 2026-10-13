import { useMemo, useState } from 'react'
import { GROUPS } from '../data/groups'
import { HASHTAGS, HASHTAG_IDS, type HashtagId } from '../data/hashtags'
import type { Patient } from '../data/patients'
import type { Extraction } from '../lib/extraction'
import { rankGroups, type Match } from '../lib/match'
import { useT } from '../i18n'
import { PatientBanner } from './PatientBanner'

const Tag = ({ id, highlight }: { id: HashtagId; highlight?: boolean }) => {
  const { lang } = useT()
  return <span className={highlight ? 'tag matched' : 'tag'}>#{HASHTAGS[id][lang === 'fi' ? 'fi' : 'en']}</span>
}

const GroupCard = ({
  match,
  rank,
  reserved,
  onReserve,
}: {
  match: Match
  rank: number
  reserved: boolean
  onReserve: () => void
}) => {
  const { t, lang } = useT()
  const { group, score, matched, distanceKm, seatsLeft } = match
  const starts = new Date(group.startDate).toLocaleDateString(lang === 'fi' ? 'fi-FI' : 'en-GB')
  return (
    <article className={seatsLeft === 0 ? 'card full' : 'card'}>
      <div className="card-rank">{rank}</div>
      <div className="card-body">
        <header>
          <h3>{group.name}</h3>
          <span className="fit" title={t.fit}>{Math.round(score * 100)} % {t.fit}</span>
        </header>
        <p className="organiser">{group.organiser}</p>
        <div className="facts">
          <span>📍 {group.address}</span>
          <span>🧭 {distanceKm === null ? t.remote : `${t.km(distanceKm)} (${t.distanceNote})`}</span>
        </div>
        <div className="facts muted">
          <span>{group.method}</span>
          <span>{t.starts} {starts} · {group.schedule}</span>
          <span>{group.languages.join(' / ').toUpperCase()}</span>
        </div>
        <div className="tags">
          {group.tags.map(id => <Tag key={id} id={id} highlight={matched.includes(id)} />)}
        </div>
      </div>
      <div className="card-side">
        <span className={seatsLeft === 0 ? 'seats none' : 'seats'}>{t.seatsLeft(seatsLeft)}</span>
        <button className="primary" disabled={seatsLeft === 0 || reserved} onClick={onReserve}>
          {reserved ? t.reserved : t.reserve}
        </button>
      </div>
    </article>
  )
}

export const Results = ({
  patient,
  extraction,
  onNewSearch,
}: {
  patient: Patient
  extraction: Extraction
  onNewSearch: () => void
}) => {
  const { t, lang } = useT()
  const [tags, setTags] = useState<HashtagId[]>(extraction.tags.map(tag => tag.id))
  const [reserved, setReserved] = useState<string[]>([])
  const evidence = new Map(extraction.tags.map(tag => [tag.id, tag.evidence]))

  const matches = useMemo(() => rankGroups(tags, patient.homeCoords, GROUPS), [tags, patient])
  const addable = HASHTAG_IDS.filter(id => !tags.includes(id))

  return (
    <main className="content">
      <PatientBanner patient={patient} />

      <section className="panel">
        <div className="section-head">
          <h2>{t.extractedTitle}</h2>
          <span className="hint">{t.source}: {extraction.source === 'mock' ? 'WK Expert AI (mock)' : extraction.source}</span>
        </div>
        <p className="hint">{t.extractedHint}</p>
        <div className="tags editable">
          {tags.map(id => (
            <button key={id} className="tag matched" title={evidence.get(id) ?? ''}
              onClick={() => setTags(tags.filter(x => x !== id))}>
              #{HASHTAGS[id][lang === 'fi' ? 'fi' : 'en']} ✕
            </button>
          ))}
          <select value="" onChange={e => setTags([...tags, e.target.value as HashtagId])}>
            <option value="" disabled>{t.addTag}</option>
            {addable.map(id => <option key={id} value={id}>#{HASHTAGS[id][lang === 'fi' ? 'fi' : 'en']}</option>)}
          </select>
        </div>
      </section>

      <div className="section-head">
        <h2>{t.resultsTitle}</h2>
        <span className="hint">{t.resultsCount(matches.length)}</span>
      </div>
      {matches.length === 0 && <p className="hint">{t.noMatches}</p>}
      <div className="cards">
        {matches.map((m, i) => (
          <GroupCard key={m.group.id} match={m} rank={i + 1}
            reserved={reserved.includes(m.group.id)}
            onReserve={() => setReserved([...reserved, m.group.id])} />
        ))}
      </div>

      <div className="actions">
        <button className="secondary" onClick={onNewSearch}>{t.newSearch}</button>
      </div>
    </main>
  )
}
