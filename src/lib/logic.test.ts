import { describe, expect, it } from 'vitest'
import { GROUPS } from '../data/groups'
import { PATIENTS } from '../data/patients'
import { ADAPTERS } from './booking'
import { mockExtractor } from './extraction'
import { applyFilters, guessFilters, NO_FILTERS } from './filters'
import { ageAt, isValidHetu } from './hetu'
import { fitScore, idfWeights, rankGroups } from './match'

const NOW = new Date('2026-10-13T12:00:00Z')

describe('hetu', () => {
  it('accepts all synthetic patients', () => {
    PATIENTS.forEach(p => expect(isValidHetu(p.hetu)).toBe(true))
  })
  it('rejects a wrong check character and impossible dates', () => {
    expect(isValidHetu('120358-912K')).toBe(false)
    expect(isValidHetu('310258-912J')).toBe(false)
  })
  it('computes age across centuries', () => {
    expect(ageAt('120358-912J', NOW)).toBe(68)
    expect(ageAt('150301A9577', NOW)).toBe(25)
  })
})

describe('mock extraction', () => {
  it('finds loneliness, grief and age for the widowed patient', async () => {
    const { tags } = await mockExtractor(PATIENTS[0]!, NOW)
    expect(tags.map(t => t.id)).toEqual(expect.arrayContaining(['yksinaisyys', 'suru', 'masennus', 'ikaantyneet']))
  })
  it('ignores negated sentences', async () => {
    const { tags } = await mockExtractor(PATIENTS[1]!, NOW)
    expect(tags.map(t => t.id)).not.toContain('paihteet')
  })
})

describe('matching', () => {
  it('weights rare tags higher than common ones', () => {
    const idf = idfWeights(GROUPS)
    expect(idf.get('krooninenkipu')!).toBeGreaterThan(idf.get('masennus')!)
  })
  it('gives a perfect score for identical tag sets', () => {
    const idf = idfWeights(GROUPS)
    expect(fitScore(['suru', 'yksinaisyys'], ['suru', 'yksinaisyys'], idf).score).toBeCloseTo(1)
  })
  it('ranks full groups last and excludes non-matching ones', () => {
    const ranked = rankGroups(['traumat', 'ahdistus'], { lat: 60.25, lon: 24.06 }, GROUPS)
    expect(ranked.at(-1)!.group.id).toBe('g08')
    expect(ranked.every(m => m.score > 0)).toBe(true)
  })
})

describe('filters', () => {
  const home = { lat: 60.249, lon: 24.065 }
  const all = rankGroups(['yksinaisyys', 'masennus', 'suru', 'ikaantyneet'], home, GROUPS)

  it('keeps everything without filters', () => {
    expect(applyFilters(all, NO_FILTERS, NOW)).toHaveLength(all.length)
  })
  it('filters by distance, time of day and fee', () => {
    const filtered = applyFilters(all, { ...NO_FILTERS, maxDistanceKm: 25, timeOfDay: 'daytime', maxFee: 0 }, NOW)
    expect(filtered.map(m => m.group.id)).toEqual(['g01'])
  })
  it('lets remote groups through the distance filter', () => {
    const sleep = rankGroups(['uni'], home, GROUPS)
    expect(applyFilters(sleep, { ...NO_FILTERS, maxDistanceKm: 10 }, NOW).map(m => m.group.id)).toContain('g04')
  })
  it('filters by start date', () => {
    const within = applyFilters(all, { ...NO_FILTERS, startsWithinDays: 14 }, NOW)
    expect(within.every(m => m.group.startDate <= '2026-10-27')).toBe(true)
  })
})

describe('filter guessing', () => {
  it('suggests nearby daytime groups for an older patient without a car on a tight budget', async () => {
    const { constraints } = await mockExtractor(PATIENTS[0]!, NOW)
    const { filters, reasons } = guessFilters(constraints)
    expect(filters).toMatchObject({ maxDistanceKm: 25, timeOfDay: 'daytime', maxFee: 10 })
    expect(reasons.maxDistanceKm).toContain('oma auto puuttuu')
  })
  it('suggests evening groups for a working patient', async () => {
    const { constraints } = await mockExtractor(PATIENTS[1]!, NOW)
    expect(guessFilters(constraints).filters.timeOfDay).toBe('evening')
  })
  it('suggests nothing without constraints', () => {
    expect(guessFilters([])).toEqual({ filters: NO_FILTERS, reasons: {} })
  })
})

describe('booking', () => {
  it('returns a reference from the mock adapter', async () => {
    const { reference } = await ADAPTERS.mock({ groupId: 'g01', referrer: 'Testi' })
    expect(reference).toMatch(/^PSY-G01-\d{4}$/)
  })
  it('only references registered adapters', () => {
    GROUPS.forEach(g => {
      if (g.booking.type === 'integrated') expect(ADAPTERS[g.booking.adapter]).toBeDefined()
    })
  })
})
