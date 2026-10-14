import { useMemo, useRef, useState } from 'react'
import type { GroupListing } from '../data/groups'
import { applyFilters, feeScale, NO_FILTERS, type Filters } from '../lib/filters'
import { browseGroups, type Match } from '../lib/match'
import { rankLabel } from '../lib/rank'
import { DISTANCE_ORDERS, newestFirst, SORT_ORDERS, sortMatches, type SortOrder } from '../lib/sort'
import { useT } from '../i18n'
import { BookingDialog } from './BookingDialog'
import { FilterBar } from './FilterBar'
import { GroupCard } from './GroupCard'
import { GroupMap } from './GroupMap'
import { remoteText } from './format'

const NEWEST_SHOWN = 3
const NEWEST_EXPANDED = 10
// Browsing has no reference point, so nothing can be sorted by distance
const ORDERS = SORT_ORDERS.filter(o => !DISTANCE_ORDERS.includes(o))

// A service listed at several sites appears once in the news
const oncePerService = (matches: Match[]) => {
  const key = (m: Match) => m.group.serviceId ?? m.group.id
  return matches.filter((m, i) => matches.findIndex(x => key(x) === key(m)) === i)
}

// The most recently added listings as one card with a list: name, then address and organiser
const News = ({
  matches,
  onHover,
  onInfo,
}: {
  matches: Match[]
  onHover: (groupId: string) => void
  onInfo: (groupId: string) => void
}) => {
  const { t, lang } = useT()
  const b = t.browser
  const [expanded, setExpanded] = useState(false)
  return (
    <section className="news" aria-labelledby="news-title">
      <h2 id="news-title">{b.newest}</h2>
      <ul className="news-list">
        {matches.slice(0, expanded ? NEWEST_EXPANDED : NEWEST_SHOWN).map(({ group }) => (
          <li key={group.id} onMouseEnter={() => onHover(group.id)}>
            <button className="link news-title" onClick={() => onInfo(group.id)}>{group.name}</button>
            <span className="news-meta">
              {[group.address || remoteText(group, lang), group.organiser].filter(Boolean).join(', ')}
            </span>
          </li>
        ))}
      </ul>
      {matches.length > NEWEST_SHOWN && (
        <button className="secondary wide" aria-expanded={expanded} onClick={() => setExpanded(e => !e)}>
          {expanded ? b.fewer : b.more}
        </button>
      )}
    </section>
  )
}

// Every listing on a map without personal details: no reference point, no distances and no fit
export const TreatmentBrowser = ({ groups, referrer }: { groups: GroupListing[]; referrer: string }) => {
  const { t, lang } = useT()
  const b = t.browser
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [order, setOrder] = useState<SortOrder>('nameAsc')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [infoFor, setInfoFor] = useState<string | null>(null)
  const cardRefs = useRef(new Map<string, HTMLElement>())

  const all = useMemo(() => browseGroups(null, groups), [groups])
  const visible = sortMatches(applyFilters(all, filters, new Date()), order, lang)
  const infoMatch = all.find(m => m.group.id === infoFor)

  const selectFromMap = (groupId: string) => {
    setActiveId(groupId)
    cardRefs.current.get(groupId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <section className="browser" aria-labelledby="browser-title">
      <h2 id="browser-title">{b.title}</h2>
      <div className="browser-layout">
        <div className="browser-main">
          <FilterBar filters={filters} feeScale={feeScale(groups)} location={false} onChange={setFilters}>
            <label>
              {b.sort}
              <select value={order} onChange={e => setOrder(e.target.value as SortOrder)}>
                {ORDERS.map(o => <option key={o} value={o}>{b.sorts[o]}</option>)}
              </select>
            </label>
          </FilterBar>
          <div className="cards">
            {visible.length === 0 && <p className="hint">{t.noFilteredMatches}</p>}
            {visible.map((m, i) => (
              <GroupCard key={m.group.id} match={m} rank={rankLabel(i)} location={false}
                active={m.group.id === activeId}
                cardRef={el => { if (el) cardRefs.current.set(m.group.id, el); else cardRefs.current.delete(m.group.id) }}
                onHover={() => setActiveId(m.group.id)}
                onInfo={() => setInfoFor(m.group.id)} />
            ))}
          </div>
        </div>

        <aside className="map-panel" aria-label={t.mapLabel}>
          <GroupMap matches={visible} all={all} home={null} zoomIn={false} contacts={[]}
            range={NO_FILTERS.distanceKm} activeId={activeId} onSelect={selectFromMap} />
        </aside>

        <News matches={oncePerService(newestFirst(all, lang))} onHover={setActiveId} onInfo={setInfoFor} />
      </div>

      {infoMatch && (
        <BookingDialog match={infoMatch} location={false} referrer={referrer} onClose={() => setInfoFor(null)} />
      )}
    </section>
  )
}
