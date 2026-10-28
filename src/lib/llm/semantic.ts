import type { GroupListing } from '../../data/groups'
import { HASHTAGS, HASHTAG_IDS, type HashtagId } from '../../data/hashtags'
import {
  ageTags, navigatorTags, olderConstraint, sentences,
  type ConstraintId, type ExtractedConstraint, type ExtractedTag, type Extraction, type Fit, type Judgment,
  type PatientExtractor, type PatientProfile, type SessionPreference,
} from '../extraction'
import { debug } from '../debug'
import { ageAt } from '../hetu'
import { serviceKey } from '../match'

// Pure prompt building and answer parsing; the engine that runs the model lives in ./engine.
// A completion takes one prompt (Gemma has no system role) and a JSON schema the output must follow.
export type Complete = (prompt: string, schema: object) => Promise<string>

// Age tags come from the identity code, never from the model
const MODEL_TAGS = HASHTAG_IDS.filter(id => id !== 'ikaantyneet' && id !== 'nuoret')
const MODEL_CONSTRAINTS = ['mobility', 'working', 'studying', 'lowIncome'] as const satisfies ConstraintId[]
const CONSTRAINT_MEANINGS: Record<(typeof MODEL_CONSTRAINTS)[number], string> = {
  mobility: 'cannot easily travel (no car, walking aid, mobility problems)',
  working: 'works, so daytime is busy',
  studying: 'studies, so daytime is busy',
  lowIncome: 'tight finances, low income or on benefits',
}
const SESSION_PREFERENCES: SessionPreference[] = ['inPerson', 'remote', 'none']
const FITS: Fit[] = ['yes', 'partly', 'no']

// Long records would overflow the 4k context window
const MAX_SENTENCES = 40
const MAX_TAGS = 6

const PREAMBLE =
  'You read Finnish patient records for a mental health care navigator in Finland. ' +
  'Use only what the text says and do not guess. Answer with JSON only.'

// Sentences are numbered so the model cites a number instead of copying text,
// which keeps every piece of evidence a real sentence from the record
export const numbered = (all: string[]) => all.map((s, i) => `[${i + 1}] ${s}`).join('\n')

const sentenceRef = { type: 'integer' }

export const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    situation: { type: 'string' },
    tags: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string', enum: MODEL_TAGS }, sentence: sentenceRef },
        required: ['id', 'sentence'],
      },
    },
    constraints: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string', enum: MODEL_CONSTRAINTS }, sentence: sentenceRef },
        required: ['id', 'sentence'],
      },
    },
    sessionPreference: { type: 'string', enum: SESSION_PREFERENCES },
    sessionSentence: sentenceRef,
  },
  required: ['situation', 'tags', 'constraints', 'sessionPreference', 'sessionSentence'],
}

export const extractionPrompt = (all: string[], age: number) => [
  PREAMBLE,
  '',
  `Patient age: ${age}.`,
  'Record sentences:',
  numbered(all),
  '',
  'Tasks:',
  '1. situation: one short English sentence on the main problems and life situation ' +
    '(for example widowed, divorced, unemployed, student, parent of small children).',
  '2. tags: topics the text clearly describes, only from this list. Give the number of the sentence that shows it. ' +
    'Skip anything the text negates ("ei", "eikä", "ilman").',
  ...MODEL_TAGS.map(id => `   ${id}: ${HASHTAGS[id].en}`),
  '3. constraints: practical circumstances, only from this list, each with its sentence number.',
  ...MODEL_CONSTRAINTS.map(id => `   ${id}: ${CONSTRAINT_MEANINGS[id]}`),
  '4. sessionPreference: "inPerson" if the patient wants to meet people face to face or dislikes remote meetings, ' +
    '"remote" if the patient prefers phone, video or online help, otherwise "none". ' +
    'sessionSentence: its sentence number, or 0.',
].join('\n')

type Cited<T> = { id: T; sentence: number }

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

// Drops anything outside the allowed ids or citing a sentence that does not exist
const grounded = <T extends string>(items: unknown, allowed: readonly T[], all: string[]) =>
  (Array.isArray(items) ? items : [])
    .filter((item): item is Cited<T> =>
      isObject(item) && allowed.includes(item.id as T) && Number.isInteger(item.sentence) &&
      (item.sentence as number) >= 1 && (item.sentence as number) <= all.length)
    .filter((item, i, list) => list.findIndex(other => other.id === item.id) === i)
    .map(item => ({ id: item.id, evidence: all[item.sentence - 1]! }))

export type ModelExtraction = { tags: ExtractedTag[]; constraints: ExtractedConstraint[]; profile: PatientProfile }

export const parseExtraction = (raw: string, all: string[]): ModelExtraction => {
  const json: unknown = JSON.parse(raw)
  if (!isObject(json)) throw new Error('Extraction answer is not an object')
  const preference = SESSION_PREFERENCES.includes(json.sessionPreference as SessionPreference)
    ? (json.sessionPreference as SessionPreference)
    : 'none'
  const sessionSentence = Number(json.sessionSentence)
  const sessionEvidence = Number.isInteger(sessionSentence) ? all[sessionSentence - 1] : undefined
  return {
    tags: grounded<HashtagId>(json.tags, MODEL_TAGS, all).slice(0, MAX_TAGS),
    constraints: grounded(json.constraints, MODEL_CONSTRAINTS, all),
    profile: {
      situation: typeof json.situation === 'string' ? json.situation.trim() : '',
      // A preference the model cannot point to in the text is not used
      sessionPreference: sessionEvidence ? preference : 'none',
      ...(sessionEvidence && preference !== 'none' && { sessionEvidence }),
    },
  }
}

export const createModelExtractor = (complete: Complete, source: string): PatientExtractor => async (input, now) => {
  const age = ageAt(input.patient.hetu, now)
  const runId = debug.currentRun()
  // The patient's own description goes first so trimming a long record never drops it
  const own = sentences({ ...input, registers: [] })
  const record = sentences({ ...input, freeText: '' })
  const all = [...own, ...record].slice(0, MAX_SENTENCES)
  debug.stage('Record sentences', {
    age, ownSentences: own.length, recordSentences: record.length, limit: MAX_SENTENCES, used: all.length, sentences: all,
  }, undefined, runId)
  const raw = await complete(extractionPrompt(all, age), EXTRACTION_SCHEMA)
  const { tags, constraints, profile } = parseExtraction(raw, all)
  debug.stage('Parsed extraction', { answer: raw, tags, constraints, profile, tagLimit: MAX_TAGS }, undefined, runId)
  return {
    tags: [...tags, ...navigatorTags(input.navigator, tags), ...ageTags(age)],
    constraints: [...constraints, ...olderConstraint(age)],
    source,
    profile,
  }
}

export const JUDGMENT_SCHEMA = {
  type: 'object',
  properties: { fit: { type: 'string', enum: FITS }, reason: { type: 'string' } },
  required: ['fit', 'reason'],
}

const FORMAT_TEXT: Record<GroupListing['format'], string> = {
  inPerson: 'in person',
  hybrid: 'in person or remotely',
  video: 'video meetings',
  phone: 'phone',
  chat: 'chat or writing',
  online: 'online programme',
}

const ageLimits = ({ eligibility: { minAge, maxAge } }: GroupListing) =>
  minAge === null && maxAge === null ? null : `${minAge ?? ''}–${maxAge ?? ''} years`

export const serviceText = (group: GroupListing) =>
  [
    `Name: ${group.name}`,
    `Organiser: ${group.organiser}`,
    `Type: ${group.method}, ${FORMAT_TEXT[group.format]}`,
    group.eligibility.notes.length > 0 && `Target group: ${group.eligibility.notes.join('; ')}`,
    ageLimits(group) && `Age limits: ${ageLimits(group)}`,
    group.description && `Description: ${group.description}`,
  ].filter(Boolean).join('\n')

export const judgmentPrompt = (extraction: Extraction, age: number, group: GroupListing) => [
  PREAMBLE,
  '',
  `Patient: ${age} years old. ${extraction.profile?.situation ?? ''}`.trim(),
  'Key sentences from the record:',
  ...extraction.tags.map(t => `- ${t.evidence}`).filter((line, i, all) => all.indexOf(line) === i),
  '',
  'Service:',
  serviceText(group),
  '',
  'Is this service meant for someone in this patient\'s situation? Check the target group: ' +
    'its age group and any life event it requires (for example losing a spouse, divorce, studying, being a parent).',
  'fit: "yes" if the patient belongs to the target group, "partly" if it is unclear, ' +
    '"no" if the target group requires something the patient clearly does not have.',
  'reason: at most 12 English words.',
].join('\n')

export const parseJudgment = (raw: string): Judgment => {
  const json: unknown = JSON.parse(raw)
  if (!isObject(json) || !FITS.includes(json.fit as Fit)) throw new Error('Judgment answer has no fit')
  return { fit: json.fit as Fit, reason: typeof json.reason === 'string' ? json.reason.trim() : '' }
}

export type Judge = (
  extraction: Extraction,
  age: number,
  groups: GroupListing[],
  onProgress: (done: number, total: number) => void,
) => Promise<Record<string, Judgment>>

// One short call per service keeps the answers reliable on a small model.
// A service the model fails on is simply left unjudged.
export const createJudge = (complete: Complete): Judge => async (extraction, age, groups, onProgress) => {
  const judgments: Record<string, Judgment> = {}
  const runId = debug.currentRun()
  onProgress(0, groups.length)
  for (const [i, group] of groups.entries()) {
    try {
      judgments[serviceKey(group)] = parseJudgment(await complete(judgmentPrompt(extraction, age, group), JUDGMENT_SCHEMA))
    } catch (error) {
      console.warn(`Judgment failed for ${group.id}`, error)
      debug.stage('Judgment failed', { service: group.name, error: error instanceof Error ? error.message : String(error) },
        undefined, runId)
    }
    onProgress(i + 1, groups.length)
  }
  return judgments
}
