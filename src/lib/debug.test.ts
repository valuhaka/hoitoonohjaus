import { beforeEach, describe, expect, it } from 'vitest'
import { PATIENTS } from '../data/patients'
import { debug } from './debug'
import { allData } from './extraction'
import { createModelExtractor, type Complete } from './llm/semantic'

const NOW = new Date('2026-10-13T12:00:00Z')

describe('debug record', () => {
  beforeEach(() => debug.clear())

  it('attaches calls and steps to the open run only', () => {
    const before = debug.call({ model: 'm', runtime: 'webllm', prompt: 'a', schema: {} })
    const run = debug.beginRun('Aino')
    const inside = debug.call({ model: 'm', runtime: 'webllm', prompt: 'b', schema: {} })
    debug.stage('Input', { registers: [] })
    debug.endRun(run)
    debug.stage('Ignored', {})
    const after = debug.call({ model: 'm', runtime: 'webllm', prompt: 'c', schema: {} })

    const { calls, runs } = debug.snapshot()
    expect(calls.map(c => [c.id, c.runId])).toEqual([[before, null], [inside, run], [after, null]])
    expect(runs).toHaveLength(1)
    expect(runs[0]!.stages.map(s => s.name)).toEqual(['Input'])
    expect(runs[0]!.finishedAt).toBeDefined()
  })

  it('updates a call in place and replaces the snapshot so React re-renders', () => {
    const id = debug.call({ model: 'm', runtime: 'transformers', prompt: 'p', schema: {} })
    const first = debug.snapshot()
    debug.updateCall(id, { raw: '```json\n{}\n```', output: '{}', usage: { promptTokens: 10, completionTokens: 2 } })
    const second = debug.snapshot()
    expect(second).not.toBe(first)
    expect(second.calls[0]).toMatchObject({ raw: '```json\n{}\n```', output: '{}', usage: { promptTokens: 10 } })
  })

  it('records the sentences sent and the raw and parsed extraction', async () => {
    const answer = JSON.stringify({
      situation: 'Lonely.', tags: [{ id: 'yksinaisyys', sentence: 1 }, { id: 'made-up', sentence: 1 }],
      constraints: [], sessionPreference: 'none', sessionSentence: 0,
    })
    const complete: Complete = async () => answer
    debug.beginRun('Aino')
    await createModelExtractor(complete, 'stub')(allData(PATIENTS[0]!), NOW)

    const stages = debug.snapshot().runs[0]!.stages
    expect(stages.map(s => s.name)).toEqual(['Record sentences', 'Parsed extraction'])
    expect((stages[0]!.data.sentences as string[]).length).toBe(stages[0]!.data.used)
    expect(stages[1]!.data.answer).toBe(answer)
    expect((stages[1]!.data.tags as { id: string }[]).map(t => t.id)).toEqual(['yksinaisyys'])
  })
})
