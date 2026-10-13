import { useMemo, useRef, useState } from 'react'
import type { GroupListing } from '../data/groups'
import { applyFilters, feeScale, NO_FILTERS, type Filters } from '../lib/filters'
import { browseGroups } from '../lib/match'
import { DEFAULT_PLACE, PLACES } from '../lib/places'
import { rankLabel } from '../lib/rank'
import { newestFirst, SORT_ORDERS, sortMatches, type SortOrder } from '../lib/sort'
import { useT } from '../i18n'
import { BookingDialog } from './BookingDialog'
import { FilterBar } from './FilterBar'
import { GroupCard } from './GroupCard'
import { GroupMap } from './GroupMap'

const NEWEST_SHOWN = 3
const NEWEST_EXPANDED = 10

// Every listing on a map without personal details: distances are measured from a chosen
// municipal centre and no fit is calculated
export const TreatmentBrowser = ({ groups, referrer }: { groups: GroupListing[]; referrer: string }) => {
  const { t, lang } = useT()
  const b = t.browser
  const [placeId, setPlaceId] = useState(DEFAULT_PLACE.id)
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [order, setOrder] = useState<SortOrder>('nearest')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [infoFor, setInfoFor] = useState<string | null>(null)
  const cardRefs = useRef(new Map<string, HTMLElement>())

  const place = PLACES.find(p => p.id === placeId) ?? DEFAULT_PLACE
  const placeName = (p: typeof place) => (lang === 'sv' ? p.sv : p.fi)
  const all = useMemo(() => browseGroups(place.coords, groups), [place, groups])
  const visible = sortMatches(applyFilters(all, filters, new Date()), order, lang)
  const newest = newestFirst(all, lang)
  const ranks = new Map(visible.map((m, i) => [m.group.id, rankLabel(i)]))
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
          <FilterBar filters={filters} feeScale={feeScale(groups)} onChange={setFilters}>
            <label>
              {b.from}
              <select value={place.id} onChange={e => setPlaceId(e.target.value)}>
                {PLACES.map(p => <option key={p.id} value={p.id}>{placeName(p)}</option>)}
              </select>
            </label>
            <label>
              {b.sort}
              <select value={order} onChange={e => setOrder(e.target.value as SortOrder)}>
                {SORT_ORDERS.map(o => <option key={o} value={o}>{b.sorts[o]}</option>)}
              </select>
            </label>
          </FilterBar>
          <div className="cards">
            {visible.length === 0 && <p className="hint">{t.noFilteredMatches}</p>}
            {visible.map(m => (
              <GroupCard key={m.group.id} match={m} rank={ranks.get(m.group.id)}
                active={m.group.id === activeId}
                cardRef={el => { if (el) cardRefs.current.set(m.group.id, el); else cardRefs.current.delete(m.group.id) }}
                onHover={() => setActiveId(m.group.id)}
                onInfo={() => setInfoFor(m.group.id)} />
            ))}
          </div>
        </div>

        <aside className="map-panel" aria-label={t.mapLabel}>
          <GroupMap matches={visible} all={all} home={place.coords} homeLabel={placeName(place)} homeIcon="origin"
            zoomIn={false} contacts={[]} range={filters.distanceKm} activeId={activeId} onSelect={selectFromMap} />
        </aside>

        <section className="newest" aria-labelledby="newest-title">
          <h2 id="newest-title">{b.newest}</h2>
          <div className="cards">
            {newest.slice(0, expanded ? NEWEST_EXPANDED : NEWEST_SHOWN).map(m => (
              <GroupCard key={m.group.id} match={m} rank={ranks.get(m.group.id)} showAdded
                active={m.group.id === activeId}
                onHover={() => setActiveId(m.group.id)}
                onInfo={() => setInfoFor(m.group.id)} />
            ))}
          </div>
          {newest.length > NEWEST_SHOWN && (
            <button className="secondary wide" aria-expanded={expanded} onClick={() => setExpanded(e => !e)}>
              {expanded ? b.fewer : b.more}
            </button>
          )}
        </section>
      </div>

      {infoMatch && <BookingDialog match={infoMatch} referrer={referrer} onClose={() => setInfoFor(null)} />}
    </section>
  )
}
