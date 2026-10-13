import { describe, expect, it } from 'vitest'
import { GROUPS } from '../data/groups'
import { PATIENTS } from '../data/patients'
import { mockExtractor } from './extraction'
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
