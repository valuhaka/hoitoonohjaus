import { useMemo, useRef, useState } from 'react'
import { GROUPS } from '../data/groups'
import { HASHTAGS, HASHTAG_IDS, type HashtagId } from '../data/hashtags'
import type { Patient } from '../data/patients'
import type { Extraction } from '../lib/extraction'
import { applyFilters, guessFilters, type Filters } from '../lib/filters'
import { rankGroups, type Match } from '../lib/match'
import { formatDate, formatFee, useT, type Lang } from '../i18n'
import { BookingDialog } from './BookingDialog'
import { FilterBar } from './FilterBar'
import { GroupMap } from './GroupMap'
import { distanceText, languagesText, scheduleText } from './format'
import { PatientBanner } from './PatientBanner'

const label = (id: HashtagId, lang: Lang) => HASHTAGS[id][lang]

const Tag = ({ id, highlight }: { id: HashtagId; highlight?: boolean }) => {
  const { lang } = useT()
  return <span className={highlight ? 'tag matched' : 'tag'}>{label(id, lang)}</span>
}

const GroupCard = ({
  match,
  rank,
  reserved,
  active,
  cardRef,
  onHover,
  onReserve,
}: {
  match: Match
  rank: number
  reserved: boolean
  active: boolean
  cardRef: (el: HTMLElement | null) => void
  onHover: () => void
  onReserve: () => void
}) => {
  const { t, lang } = useT()
  const { group, score, matched, distanceKm, seatsLeft } = match
  const className = ['card', seatsLeft === 0 && 'full', active && 'active'].filter(Boolean).join(' ')
  return (
    <article ref={cardRef} className={className} onMouseEnter={onHover}>
      <div className="card-rank">{rank}</div>
      <div className="card-body">
        <header>
          <h3>{group.name}</h3>
          <span className="fit" title={t.fit}>{Math.round(score * 100)} % {t.fit}</span>
        </header>
        <p className="organiser">{group.organiser}</p>
        <div className="facts">
          <span>{group.address}</span>
          <span>{distanceText(distanceKm, lang)}</span>
          <span>{formatFee(group.fee, lang)}</span>
        </div>
        <div className="facts muted">
          <span>{group.method}</span>
          <span>{t.starts} {formatDate(group.startDate, lang)} · {scheduleText(group, lang)}</span>
          <span>{languagesText(group)}</span>
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
  referrer,
  onNewSearch,
}: {
  patient: Patient
  extraction: Extraction
  referrer: string
  onNewSearch: () => void
}) => {
  const { t, lang } = useT()
  const [tags, setTags] = useState<HashtagId[]>(extraction.tags.map(tag => tag.id))
  const guess = useMemo(() => guessFilters(extraction.constraints), [extraction])
  const [filters, setFilters] = useState<Filters>(guess.filters)
  const [activeId, setActiveId] = useState<string | null>(null)
  const cardRefs = useRef(new Map<string, HTMLElement>())
  // groupId -> reservation reference
  const [holds, setHolds] = useState<Record<string, string>>({})
  const [bookingFor, setBookingFor] = useState<string | null>(null)
  const evidence = new Map(extraction.tags.map(tag => [tag.id, tag.evidence]))

  const ranked = useMemo(() => {
    const groups = GROUPS.map(g => (holds[g.id] ? { ...g, enrolled: g.enrolled + 1 } : g))
    return rankGroups(tags, patient.homeCoords, groups)
  }, [tags, patient, holds])
  const visible = applyFilters(ranked, filters, new Date())
  const bookingMatch = ranked.find(m => m.group.id === bookingFor)
  const addable = HASHTAG_IDS.filter(id => !tags.includes(id))

  const selectFromMap = (groupId: string) => {
    setActiveId(groupId)
    cardRefs.current.get(groupId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <main className="content wide">
      <PatientBanner patient={patient} />

      <section className="panel">
        <h2>{t.extractedTitle}</h2>
        <div className="tags editable">
          {tags.map(id => (
            <span key={id} className="tag matched" title={evidence.get(id) ?? ''}>
              {label(id, lang)}
              <button className="tag-remove" aria-label={`${t.removeTag}: ${label(id, lang)}`}
                onClick={() => setTags(tags.filter(x => x !== id))}>×</button>
            </span>
          ))}
          <select value="" onChange={e => setTags([...tags, e.target.value as HashtagId])}>
            <option value="" disabled>{t.addTag}</option>
            {addable.map(id => <option key={id} value={id}>{label(id, lang)}</option>)}
          </select>
        </div>
      </section>

      <h2>{t.resultsTitle}</h2>
      <FilterBar filters={filters} guess={guess} onChange={setFilters} />
      <div className="results-layout">
        <div className="cards">
          {ranked.length === 0 && <p className="hint">{t.noMatches}</p>}
          {ranked.length > 0 && visible.length === 0 && <p className="hint">{t.noFilteredMatches}</p>}
          {visible.map((m, i) => (
            <GroupCard key={m.group.id} match={m} rank={i + 1}
              reserved={m.group.id in holds}
              active={m.group.id === activeId}
              cardRef={el => { if (el) cardRefs.current.set(m.group.id, el); else cardRefs.current.delete(m.group.id) }}
              onHover={() => setActiveId(m.group.id)}
              onReserve={() => setBookingFor(m.group.id)} />
          ))}
        </div>
        <aside className="map-panel" aria-label={t.mapLabel}>
          <GroupMap matches={visible}
            home={patient.nonDisclosure ? null : patient.homeCoords}
            radiusKm={filters.maxDistanceKm}
            activeId={activeId}
            onSelect={selectFromMap} />
        </aside>
      </div>

      <div className="actions">
        <button className="secondary" onClick={onNewSearch}>{t.newSearch}</button>
      </div>

      {bookingMatch && (
        <BookingDialog match={bookingMatch} referrer={referrer}
          onReserved={reference => setHolds(h => ({ ...h, [bookingMatch.group.id]: reference }))}
          onClose={() => setBookingFor(null)} />
      )}
    </main>
  )
}
