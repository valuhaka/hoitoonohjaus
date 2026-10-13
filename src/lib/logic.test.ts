import { describe, expect, it } from 'vitest'
import { GROUPS } from '../data/groups'
import { HASHTAG_IDS } from '../data/hashtags'
import { REAL_GROUPS } from '../data/listings'
import { PATIENTS } from '../data/patients'
import { SOURCE_URLS, SOURCES_WITHOUT_LISTINGS, TREATMENTS } from '../data/treatments'
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
    expect(within.every(m => m.group.startDate !== null && m.group.startDate <= '2026-10-27')).toBe(true)
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

describe('real treatment catalogue', () => {
  it('has unique ids', () => {
    const ids = TREATMENTS.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('only uses known hashtags, without duplicates', () => {
    TREATMENTS.forEach(t => {
      t.tags.forEach(tag => expect(HASHTAG_IDS).toContain(tag))
      expect(new Set(t.tags).size).toBe(t.tags.length)
    })
  })
  it('explains every entry left out of matching', () => {
    TREATMENTS.filter(t => t.tags.length === 0).forEach(t => expect(t.untaggedReason, t.id).toBeTruthy())
    TREATMENTS.filter(t => t.tags.length > 0).forEach(t => expect(t.untaggedReason, t.id).toBeUndefined())
  })
  it('traces every entry to an input page and covers every input page', () => {
    const sources = new Set<string>(SOURCE_URLS)
    TREATMENTS.forEach(t => expect(sources.has(t.sourceUrl), t.id).toBe(true))
    const used = new Set(TREATMENTS.map(t => t.sourceUrl))
    SOURCE_URLS.forEach(url => expect(used.has(url) || url in SOURCES_WITHOUT_LISTINGS, url).toBe(true))
  })
  it('keeps coordinates inside southern Finland', () => {
    TREATMENTS.flatMap(t => t.locations).forEach(l => {
      if (!l.coords) return
      expect(l.coords.lat).toBeGreaterThan(59.7)
      expect(l.coords.lat).toBeLessThan(60.7)
      expect(l.coords.lon).toBeGreaterThan(22.8)
      expect(l.coords.lon).toBeLessThan(25.8)
    })
  })
  it('never reports more enrolled than capacity', () => {
    TREATMENTS.forEach(({ vacancy: v }) => {
      if (v.capacity !== null && v.enrolled !== null) expect(v.enrolled).toBeLessThanOrEqual(v.capacity)
    })
  })
})

describe('real listings in matching', () => {
  const home = { lat: 60.2297, lon: 24.8837 } // Haaga, Helsinki
  const byService = (id: string) => REAL_GROUPS.filter(g => g.serviceId === id)

  it('lists a multi-site service once per mapped location', () => {
    expect(byService('hki-mieppi')).toHaveLength(4)
    expect(new Set(REAL_GROUPS.map(g => g.id)).size).toBe(REAL_GROUPS.length)
  })
  it('offers only the nearest site of a service', () => {
    const ranked = rankGroups(['stressi'], home, REAL_GROUPS)
    const mieppi = ranked.filter(m => m.group.serviceId === 'hki-mieppi')
    expect(mieppi).toHaveLength(1)
    expect(mieppi[0]!.group.address).toContain('Hopeatie 6')
  })
  it('counts a multi-site service once in the tag weights', () => {
    const once = idfWeights(REAL_GROUPS.filter(g => !g.id.includes('@') || g.id.endsWith('@0')))
    expect(idfWeights(REAL_GROUPS).get('masennus')).toBeCloseTo(once.get('masennus')!)
  })
  it('treats a group marked full as having no seats and ranks it last', () => {
    const ranked = rankGroups(['ero'], home, REAL_GROUPS)
    const full = ranked.find(m => m.group.id === 'ms-eroryhma-pks-1')!
    expect(full.seatsLeft).toBe(0)
    expect(ranked.at(-1)!.seatsLeft).toBe(0)
    expect(ranked.find(m => m.group.id === 'ms-eetu')!.seatsLeft).toBeNull()
  })
  it('never filters a listing out on values the organiser does not publish', () => {
    const ranked = rankGroups(['masennus', 'ahdistus', 'paihteet'], home, REAL_GROUPS)
    const luvn = ranked.find(m => m.group.serviceId === 'luvn-mtp')!
    expect(luvn.group.fee).toBeNull()
    const strict = { ...NO_FILTERS, maxFee: 0, timeOfDay: 'evening' as const, startsWithinDays: 14 }
    expect(applyFilters([luvn], strict, NOW)).toHaveLength(1)
  })
  it('keeps groups announced for later out of the start filter', () => {
    const ranked = rankGroups(['traumat'], home, REAL_GROUPS)
    const later = ranked.filter(m => m.group.status === 'applyLater')
    expect(later.length).toBeGreaterThan(0)
    expect(applyFilters(later, { ...NO_FILTERS, startsWithinDays: 31 }, NOW)).toHaveLength(0)
  })
  it('links every real listing to the organiser', () => {
    REAL_GROUPS.forEach(g => expect(g.booking.type).toBe('external'))
  })
})
