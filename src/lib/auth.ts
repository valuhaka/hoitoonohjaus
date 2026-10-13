import { PATIENTS, type Patient } from '../data/patients'

// Who is signed in decides whose data can be opened:
// - professional: any patient, found by search, with a logged access basis
// - patient:      only themselves
// - proxy:        only the persons they act for (a guardian's child, a Suomi.fi mandate)
export type Role = 'professional' | 'patient' | 'proxy'
export const ROLES: Role[] = ['patient', 'proxy', 'professional']

export type User = {
  role: Role
  name: string
  title: string
  // Own identity code, for patient and proxy users
  hetu: string | null
  // Identity codes the user may act for (proxy only)
  actsFor: string[]
}

// Demo accounts only; production uses Suomi.fi identification or the organisation's identity provider
const ACCOUNTS: Record<Role, { username: string; user: User }> = {
  professional: {
    username: 'demo',
    user: { role: 'professional', name: 'Iiris Ainias', title: 'Psykologi', hetu: null, actsFor: [] },
  },
  patient: {
    username: 'aino',
    user: { role: 'patient', name: 'Aino Virtanen', title: '', hetu: '120358-912J', actsFor: [] },
  },
  proxy: {
    username: 'jari',
    user: { role: 'proxy', name: 'Jari Korhonen', title: '', hetu: '230679-921S', actsFor: ['140311A962A'] },
  },
}

export const DEMO_PASSWORD = 'demo'
export const demoUsername = (role: Role) => ACCOUNTS[role].username

export const authenticate = (role: Role, username: string, password: string): User | null => {
  const account = ACCOUNTS[role]
  return username.trim().toLowerCase() === account.username && password === DEMO_PASSWORD ? account.user : null
}

// Patients the user may open without a search: themselves, or the persons they act for
export const ownPatients = (user: User): Patient[] =>
  user.role === 'patient' ? PATIENTS.filter(p => p.hetu === user.hetu)
  : user.role === 'proxy' ? PATIENTS.filter(p => user.actsFor.includes(p.hetu))
  : []

export const canAccess = (user: User, hetu: string): boolean =>
  user.role === 'professional' || ownPatients(user).some(p => p.hetu === hetu)
