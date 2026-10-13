import type { HashtagId } from '../data/hashtags'

// Navigator questionnaires a patient fills in before the first visit. Sharing the 8-digit
// result code with a professional gives consent to use the answers in choosing treatment.
// - Terapianavigaattori: adults
// - Interventionavigaattori (Nuorten navi): young people
export type NavigatorId = 'terapianavigaattori' | 'interventionavigaattori'
export const NAVIGATOR_IDS: NavigatorId[] = ['terapianavigaattori', 'interventionavigaattori']

export const NAVIGATORS: Record<NavigatorId, { name: string; url: string; adults: boolean }> = {
  terapianavigaattori: { name: 'Terapianavigaattori', url: 'https://www.terapianavigaattori.fi', adults: true },
  interventionavigaattori: { name: 'Interventionavigaattori', url: 'https://www.mielenterveystalo.fi', adults: false },
}

export const navigatorForAge = (age: number): NavigatorId =>
  age >= 18 ? 'terapianavigaattori' : 'interventionavigaattori'

export type NavigatorResult = { navigator: NavigatorId; code: string; tags: HashtagId[] }

const CODE = /^\d{8}$/

// Stand-in for the navigator services' result lookup; these codes exist only in the demo
const DEMO_RESULTS: Record<string, Omit<NavigatorResult, 'code'>> = {
  '48213097': { navigator: 'terapianavigaattori', tags: ['masennus', 'yksinaisyys', 'uni'] },
  '62059184': { navigator: 'terapianavigaattori', tags: ['ahdistus', 'paniikkihairio', 'stressi'] },
  '51730462': { navigator: 'interventionavigaattori', tags: ['sosiaalinenahdistus', 'ahdistus'] },
}

export const normalizeCode = (input: string) => input.replace(/[\s-]/g, '')
export const isCodeFormat = (input: string) => CODE.test(normalizeCode(input))

export type CodeLookup =
  | { kind: 'found'; result: NavigatorResult }
  | { kind: 'invalid' }
  | { kind: 'notFound' }

export const lookupNavigatorCode = (navigator: NavigatorId, input: string): CodeLookup => {
  const code = normalizeCode(input)
  if (!CODE.test(code)) return { kind: 'invalid' }
  const hit = DEMO_RESULTS[code]
  return hit && hit.navigator === navigator ? { kind: 'found', result: { ...hit, code } } : { kind: 'notFound' }
}
