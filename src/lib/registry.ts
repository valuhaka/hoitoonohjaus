import { PATIENTS, type Patient } from '../data/patients'
import type { User } from './auth'
import { isValidHetu, normalizeHetu } from './hetu'

// Stand-in for the customer organisation's patient information system integration

export type AccessReason = 'careRelationship' | 'referral' | 'consultation'

// Patients and proxies open their own data; the role is logged instead of a basis
export type AuditEntry = {
  at: string
  user: string
  hetu: string
  reason: AccessReason | 'own' | 'proxy'
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export type SearchResult =
  | { kind: 'found'; patients: Patient[] }
  | { kind: 'invalid'; message: 'invalidHetu' | 'tooLittle' }
  | { kind: 'forbidden' }

const FULL_HETU = /^\d{6}[-+A-FU-Y]\d{3}[0-9A-Y]$/i
const BIRTH_DATE = /^\d{6}$/

// Case- and accent-insensitive, so "aino" finds "Aino" and "hamalainen" finds "Hämäläinen"
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

// Every name token must start a different part of the name, in any order
const namesMatch = (tokens: string[], parts: string[]): boolean => {
  if (tokens.length === 0) return true
  const [first, ...rest] = tokens
  return parts.some((part, i) => part.startsWith(first!) && namesMatch(rest, parts.filter((_, j) => j !== i)))
}

const matches = (patient: Patient, tokens: string[]) => {
  const parts = [...patient.firstNames.split(/\s+/), ...patient.lastName.split(/[\s-]+/)].map(fold)
  return tokens.every(t =>
    FULL_HETU.test(t) ? patient.hetu === normalizeHetu(t)
    : BIRTH_DATE.test(t) ? patient.hetu.startsWith(t)
    : true,
  ) && namesMatch(tokens.filter(t => !/^\d/.test(t)).map(fold), parts)
}

// Any order and any subset of first names, surname, identity code or birth date (DDMMYY).
// A full identity code is enough on its own; otherwise two pieces are needed, so the register can't be browsed by one name.
export const searchPatients = async (query: string, user: User): Promise<SearchResult> => {
  if (user.role !== 'professional') return { kind: 'forbidden' }
  await delay(300)
  const tokens = query.split(/[,\s]+/).filter(Boolean)
  const hetus = tokens.filter(t => /^\d{6}./.test(t))
  if (hetus.some(t => !isValidHetu(t))) return { kind: 'invalid', message: 'invalidHetu' }
  if (hetus.length === 0 && tokens.length < 2) return { kind: 'invalid', message: 'tooLittle' }
  return { kind: 'found', patients: PATIENTS.filter(p => matches(p, tokens)) }
}

export const logAccess = (log: AuditEntry[], entry: Omit<AuditEntry, 'at'>): AuditEntry[] => [
  ...log,
  { ...entry, at: new Date().toISOString() },
]
