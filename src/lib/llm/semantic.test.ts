import { describe, expect, it } from 'vitest'
import { REAL_GROUPS } from '../../data/listings'
import { PATIENTS } from '../../data/patients'
import { allData, type Extraction } from '../extraction'
import { rankGroups, semanticRank, serviceKey } from '../match'
import { createJudge, createModelExtractor, extractionPrompt, parseExtraction, parseJudgment, type Complete } from './semantic'

const NOW = new Date('2026-10-13T12:00:00Z')
const aino = PATIENTS[0]! // 68, widowed, lonely
const jari = PATIENTS[3]! // 47, laid off, depressed
const WIDOW_GROUP = REAL_GROUPS.find(g => g.serviceId === 'mieli-ikaihmiset-lesket')!

// Stands in for the model: answers with a fixed JSON per prompt kind
const stub = (extraction: object, judgment: object = { fit: 'yes', reason: 'ok' }): Complete =>
  async (_prompt, schema) => JSON.stringify('fit' in (schema as { properties: object }).properties ? judgment : extraction)

describe('language model extraction', () => {
  const all = ['Puoliso menehtyi 2024, jäänyt leskeksi.', 'Kokee voimakasta yksinäisyyttä.', 'Haluaa tavata ihmisiä kasvokkain.']

  it('numbers the sentences and lists only the non-age tags', () => {
    const prompt = extractionPrompt(all, 68)
    expect(prompt).toContain('[2] Kokee voimakasta yksinäisyyttä.')
    expect(prompt).toContain('suru: Grief')
    expect(prompt).not.toContain('ikaantyneet')
  })
  it('keeps only cited, known tags and uses the cited sentence as evidence', () => {
    const parsed = parseExtraction(JSON.stringify({
      situation: 'Widowed and lonely.',
      tags: [{ id: 'suru', sentence: 1 }, { id: 'yksinaisyys', sentence: 2 }, { id: 'suru', sentence: 2 },
        { id: 'made-up', sentence: 1 }, { id: 'masennus', sentence: 9 }],
      constraints: [{ id: 'mobility', sentence: 0 }],
      sessionPreference: 'inPerson',
      sessionSentence: 3,
    }), all)
    expect(parsed.tags).toEqual([{ id: 'suru', evidence: all[0] }, { id: 'yksinaisyys', evidence: all[1] }])
    expect(parsed.constraints).toEqual([])
    expect(parsed.profile).toEqual({ situation: 'Widowed and lonely.', sessionPreference: 'inPerson', sessionEvidence: all[2] })
  })
  it('ignores a session preference the model cannot point to', () => {
    const parsed = parseExtraction(JSON.stringify({
      situation: '', tags: [], constraints: [], sessionPreference: 'remote', sessionSentence: 0,
    }), all)
    expect(parsed.profile.sessionPreference).toBe('none')
  })
  it('adds age tags from the identity code and puts the free text first', async () => {
    const input = { ...allData(aino), freeText: 'Haluan tavata ihmisiä kasvokkain.' }
    let prompt = ''
    const extractor = createModelExtractor(async (p, schema) => { prompt = p; return stub({
      situation: 'Widowed.', tags: [{ id: 'suru', sentence: 2 }], constraints: [], sessionPreference: 'inPerson', sessionSentence: 1,
    })(p, schema) }, 'test')
    const extraction = await extractor(input, NOW)
    expect(prompt).toContain('[1] Haluan tavata ihmisiä kasvokkain.')
    expect(extraction.tags.map(t => t.id)).toEqual(['suru', 'ikaantyneet'])
    expect(extraction.constraints.map(c => c.id)).toEqual(['older'])
    expect(extraction.profile?.sessionEvidence).toBe('Haluan tavata ihmisiä kasvokkain.')
  })
  it('rejects an answer without a valid fit and skips that service', async () => {
    expect(() => parseJudgment('{"fit":"maybe"}')).toThrow()
    const judge = createJudge(stub({}, { fit: 'maybe' }))
    expect(await judge({ tags: [], constraints: [], source: 'test' }, 47, [WIDOW_GROUP], () => undefined)).toEqual({})
  })
})

describe('semantic ranking', () => {
  // The example group: a remote peer group for older people who lost a spouse
  const widowRank = (extraction: Extraction, age: number) => {
    const tags = extraction.tags.map(t => t.id)
    const byTags = rankGroups(tags, jari.homeCoords, REAL_GROUPS)
    const ranked = semanticRank(byTags, { age, profile: extraction.profile, judgments: extraction.judgments })
    return { byTags: byTags.findIndex(m => m.group === WIDOW_GROUP), ranked, index: ranked.findIndex(m => m.group === WIDOW_GROUP) }
  }
  const lonely: Extraction = {
    tags: [{ id: 'yksinaisyys', evidence: '' }, { id: 'suru', evidence: '' }, { id: 'masennus', evidence: '' }],
    constraints: [],
    source: 'test',
  }

  it('moves the widow group down for a younger patient who has not lost a spouse and wants to meet in person', () => {
    const extraction: Extraction = {
      ...lonely,
      profile: { situation: 'Lonely after moving.', sessionPreference: 'inPerson', sessionEvidence: 'x' },
      judgments: { [serviceKey(WIDOW_GROUP)]: { fit: 'no', reason: 'Has not lost a spouse' } },
    }
    const { byTags, ranked, index } = widowRank(extraction, 47)
    expect(index).toBeGreaterThan(byTags)
    expect(ranked[index]!.adjustments!.map(a => a.kind)).toEqual(['fit', 'session', 'ageGroup'])
  })
  it('keeps the widow group up for a widowed older patient', () => {
    const extraction: Extraction = {
      ...lonely,
      profile: { situation: 'Widowed in 2024.', sessionPreference: 'none' },
      judgments: { [serviceKey(WIDOW_GROUP)]: { fit: 'yes', reason: 'Widowed and over 70' } },
    }
    const { byTags, ranked, index } = widowRank(extraction, 72)
    expect(index).toBeLessThanOrEqual(byTags)
    expect(ranked[index]!.adjustments).toEqual([{ kind: 'fit', fit: 'yes', reason: 'Widowed and over 70', weight: 1 }])
  })
  it('only applies the age-group factor without a language model', () => {
    const ranked = semanticRank(rankGroups(['yksinaisyys', 'ikaantyneet'], jari.homeCoords, REAL_GROUPS), { age: 40 })
    ranked.forEach(m => m.adjustments!.forEach(a => expect(a.kind).toBe('ageGroup')))
    expect(ranked.some(m => m.adjustments!.length > 0)).toBe(true)
  })
})
