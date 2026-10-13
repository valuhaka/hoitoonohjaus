import { PATIENTS, type Patient } from '../data/patients'
import { isValidHetu, normalizeHetu } from './hetu'

// Stand-in for the customer organisation's patient information system integration

export type AccessReason = 'careRelationship' | 'referral' | 'consultation'

export type AuditEntry = {
  at: string
  user: string
  hetu: string
  reason: AccessReason
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export type SearchResult =
  | { kind: 'found'; patients: Patient[] }
  | { kind: 'invalid'; message: 'invalidHetu' | 'nameTooShort' }

export const searchPatients = async (query: string): Promise<SearchResult> => {
  await delay(300)
  const q = query.trim()
  if (/^\d{6}/.test(q)) {
    if (!isValidHetu(q)) return { kind: 'invalid', message: 'invalidHetu' }
    return { kind: 'found', patients: PATIENTS.filter(p => p.hetu === normalizeHetu(q)) }
  }
  // Name search requires surname and first name to avoid browsing the register
  const [last = '', first = ''] = q.split(/[,\s]+/).map(s => s.toLowerCase())
  if (last.length < 2 || first.length < 1) return { kind: 'invalid', message: 'nameTooShort' }
  return {
    kind: 'found',
    patients: PATIENTS.filter(
      p => p.lastName.toLowerCase().startsWith(last) && p.firstNames.toLowerCase().startsWith(first),
    ),
  }
}

export const logAccess = (log: AuditEntry[], entry: Omit<AuditEntry, 'at'>): AuditEntry[] => [
  ...log,
  { ...entry, at: new Date().toISOString() },
]
