import { isActive, NO_FILTERS, type FilterGuess, type Filters, type TimeOfDay } from '../lib/filters'
import { useT } from '../i18n'

const DISTANCES = [10, 25, 50]

const toNumber = (value: string) => (value === '' ? null : Number(value))
const fromNumber = (value: number | null) => (value === null ? '' : String(value))

export const FilterBar = ({
  filters,
  guess,
  onChange,
}: {
  filters: Filters
  guess: FilterGuess
  onChange: (filters: Filters) => void
}) => {
  const { t } = useT()
  const f = t.filters
  // A filter counts as suggested while it still holds the guessed value
  const suggested = (key: keyof Filters) => {
    const reason = guess.reasons[key]
    return reason && filters[key] === guess.filters[key]
      ? { className: 'suggested', title: `${f.suggested}: ${reason}` }
      : {}
  }
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value })

  return (
    <div className="filters">
      <label {...suggested('startsWithinDays')}>
        {f.start}
        <select value={fromNumber(filters.startsWithinDays)}
          onChange={e => set('startsWithinDays', toNumber(e.target.value))}>
          <option value="">{f.startAny}</option>
          <option value="14">{f.start14}</option>
          <option value="31">{f.start31}</option>
        </select>
      </label>
      <label {...suggested('timeOfDay')}>
        {f.time}
        <select value={filters.timeOfDay} onChange={e => set('timeOfDay', e.target.value as TimeOfDay)}>
          <option value="any">{f.timeAny}</option>
          <option value="daytime">{f.timeDay}</option>
          <option value="evening">{f.timeEvening}</option>
        </select>
      </label>
      <label {...suggested('maxFee')}>
        {f.cost}
        <select value={fromNumber(filters.maxFee)} onChange={e => set('maxFee', toNumber(e.target.value))}>
          <option value="">{f.costAny}</option>
          <option value="0">{f.costFree}</option>
          <option value="10">{f.costMax10}</option>
        </select>
      </label>
      <label {...suggested('maxDistanceKm')}>
        {f.distance}
        <select value={fromNumber(filters.maxDistanceKm)}
          onChange={e => set('maxDistanceKm', toNumber(e.target.value))}>
          <option value="">{f.distanceAny}</option>
          {DISTANCES.map(km => <option key={km} value={km}>{f.distanceMax(km)}</option>)}
        </select>
      </label>
      {isActive(filters) && (
        <button className="secondary" onClick={() => onChange(NO_FILTERS)}>{f.reset}</button>
      )}
    </div>
  )
}
