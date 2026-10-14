import { useMemo, useRef, useState } from 'react'
import type { GroupListing } from '../data/groups'
import { HASHTAGS, HASHTAG_IDS, type HashtagId } from '../data/hashtags'
import type { Patient } from '../data/patients'
import type { User } from '../lib/auth'
import type { Extraction } from '../lib/extraction'
import { ageAt } from '../lib/hetu'
import { applyFilters, feeScale, guessFilters, type Filters } from '../lib/filters'
import { rankGroups } from '../lib/match'
import { rankLabel } from '../lib/rank'
import { useT, type Lang } from '../i18n'
import { BookingDialog } from './BookingDialog'
import { FilterBar } from './FilterBar'
import { GroupCard } from './GroupCard'
import { GroupMap } from './GroupMap'
import { PatientBanner } from './PatientBanner'

const label = (id: HashtagId, lang: Lang) => HASHTAGS[id][lang]

export const Results = ({
  patient,
  extraction,
  groups,
  user,
  onNewSearch,
}: {
  patient: Patient
  groups: GroupListing[]
  extraction: Extraction
  user: User
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
    const held = groups.map(g => (holds[g.id] && g.enrolled !== null ? { ...g, enrolled: g.enrolled + 1 } : g))
    // Inclusion criteria leave out groups the patient cannot join
    return rankGroups(tags, patient.homeCoords, held, { age: ageAt(patient.hetu, new Date()), municipality: patient.municipality })
  }, [tags, patient, groups, holds])
  const visible = applyFilters(ranked, filters, new Date())
  const bookingMatch = ranked.find(m => m.group.id === bookingFor)
  const addable = HASHTAG_IDS.filter(id => !tags.includes(id))
  // A non-disclosure order hides home and care contacts from everyone but the patient
  const showLocations = !patient.nonDisclosure || user.hetu === patient.hetu

  const selectFromMap = (groupId: string) => {
    setActiveId(groupId)
    cardRefs.current.get(groupId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <main className="content wide">
      <PatientBanner patient={patient} />

      <div className="results-layout">
        <div className="results-main">
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
          <FilterBar filters={filters} guess={guess} feeScale={feeScale(groups)} onChange={setFilters} />
          <div className="cards">
            {ranked.length === 0 && <p className="hint">{t.noMatches}</p>}
            {ranked.length > 0 && visible.length === 0 && <p className="hint">{t.noFilteredMatches}</p>}
            {visible.map((m, i) => (
              <GroupCard key={m.group.id} match={m} rank={rankLabel(i)} location
                reserved={m.group.id in holds}
                active={m.group.id === activeId}
                cardRef={el => { if (el) cardRefs.current.set(m.group.id, el); else cardRefs.current.delete(m.group.id) }}
                onHover={() => setActiveId(m.group.id)}
                onInfo={() => setBookingFor(m.group.id)} />
            ))}
          </div>
        </div>
        <aside className="map-panel" aria-label={t.mapLabel}>
          <GroupMap matches={visible} all={ranked}
            home={showLocations ? patient.homeCoords : null}
            contacts={showLocations ? patient.contacts : []}
            range={filters.distanceKm}
            activeId={activeId}
            onSelect={selectFromMap} />
        </aside>
      </div>

      <div className="actions">
        <button className="secondary" onClick={onNewSearch}>{t.newSearch}</button>
      </div>

      {bookingMatch && (
        <BookingDialog match={bookingMatch} referrer={user.name}
          onReserved={reference => setHolds(h => ({ ...h, [bookingMatch.group.id]: reference }))}
          onClose={() => setBookingFor(null)} />
      )}
    </main>
  )
}
