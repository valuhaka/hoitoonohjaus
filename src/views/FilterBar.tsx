import type { CSSProperties } from 'react'
import { GENDERS, type Gender } from '../data/treatments'
import {
  DISTANCE_SCALE, isActive, NO_FILTERS, SESSION_FILTERS,
  type FilterGuess, type Filters, type Range, type Scale, type SessionFilter, type TimeOfDay,
} from '../lib/filters'
import { useT } from '../i18n'

type Suggestion = { className?: string; title?: string }

// Two-handle slider like in online stores; the right end of the scale means "no upper limit"
const RangeSlider = ({
  label,
  value,
  scale,
  unit,
  suggestion,
  onChange,
}: {
  label: string
  value: Range
  scale: Scale
  unit: string
  suggestion: Suggestion
  onChange: (range: Range) => void
}) => {
  const { t } = useT()
  const f = t.filters
  const top = Math.min(value.max ?? scale.max, scale.max)
  const text =
    value.min === 0 && value.max === null ? f.any
    : value.max === null ? `${f.min} ${value.min} ${unit}`
    : `${value.min}–${value.max} ${unit}`
  const style = { '--lo': `${(value.min / scale.max) * 100}%`, '--hi': `${(top / scale.max) * 100}%` } as CSSProperties

  return (
    <div role="group" aria-label={label} className={['range-filter', suggestion.className].filter(Boolean).join(' ')}
      title={suggestion.title}>
      <span className="range-label">{label}<output>{text}</output></span>
      <div className="range" style={style}>
        <input type="range" min={0} max={scale.max} step={scale.step} value={value.min} aria-label={`${label}: ${f.min}`}
          onChange={e => onChange({ ...value, min: Math.min(Number(e.target.value), top) })} />
        <input type="range" min={0} max={scale.max} step={scale.step} value={top} aria-label={`${label}: ${f.max}`}
          onChange={e => {
            const max = Math.max(Number(e.target.value), value.min)
            onChange({ ...value, max: max >= scale.max ? null : max })
          }} />
      </div>
    </div>
  )
}

const toNumber = (value: string) => (value === '' ? null : Number(value))
const fromNumber = (value: number | null) => (value === null ? '' : String(value))

export const FilterBar = ({
  filters,
  guess,
  feeScale,
  onChange,
}: {
  filters: Filters
  guess: FilterGuess
  feeScale: Scale
  onChange: (filters: Filters) => void
}) => {
  const { t } = useT()
  const f = t.filters
  // A filter counts as suggested while it still holds the guessed value
  const suggested = (key: keyof Filters): Suggestion => {
    const reason = guess.reasons[key]
    return reason && JSON.stringify(filters[key]) === JSON.stringify(guess.filters[key])
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
      <label>
        {f.session}
        <select value={filters.session} onChange={e => set('session', e.target.value as SessionFilter)}>
          {SESSION_FILTERS.map(s => <option key={s} value={s}>{f.sessions[s]}</option>)}
        </select>
      </label>
      <label>
        {f.gender}
        <select value={filters.gender} onChange={e => set('gender', e.target.value as Gender | 'any')}>
          {(['any', ...GENDERS] as const).map(g => <option key={g} value={g}>{f.genders[g]}</option>)}
        </select>
      </label>
      {/* Nothing to filter when every listing is free */}
      {feeScale.max > 0 && (
        <RangeSlider label={f.cost} unit="€" value={filters.fee} scale={feeScale}
          suggestion={suggested('fee')} onChange={v => set('fee', v)} />
      )}
      <RangeSlider label={f.distance} unit="km" value={filters.distanceKm} scale={DISTANCE_SCALE}
        suggestion={suggested('distanceKm')} onChange={v => set('distanceKm', v)} />
      {isActive(filters) && (
        <button className="secondary" onClick={() => onChange(NO_FILTERS)}>{f.reset}</button>
      )}
    </div>
  )
}
