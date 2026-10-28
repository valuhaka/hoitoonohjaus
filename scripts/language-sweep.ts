// The sweep before release (style.md, language rule): drives the running app in every language and
// reports Finnish UI text that shows up in Swedish or English.
//   npm run dev                                   (in another terminal)
//   node scripts/language-sweep.ts [url]          (default http://localhost:5173)
// Needs a Playwright browser once: npx playwright install chromium
import { chromium, type Page } from 'playwright'

const URL = process.argv[2] ?? 'http://localhost:5173/'
const LANGS = ['fi', 'sv', 'en'] as const
type Lang = (typeof LANGS)[number]
type Role = 'patient' | 'proxy' | 'professional'
const ACCOUNTS: Record<Role, string> = { patient: 'aino', proxy: 'jari', professional: 'demo' }
const ROLE_INDEX: Record<Role, number> = { patient: 0, proxy: 1, professional: 2 }

// Visible text plus the attributes screen readers and tooltips use, outside the map canvas
const collect = (page: Page) =>
  page.evaluate(() => {
    const found: string[] = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent?.trim()
      if (text && !n.parentElement?.closest('.maplibregl-canvas-container')) found.push(text)
    }
    for (const el of document.querySelectorAll('[aria-label],[title],[placeholder],[alt]'))
      for (const attr of ['aria-label', 'title', 'placeholder', 'alt']) {
        const value = el.getAttribute(attr)?.trim()
        if (value) found.push(value)
      }
    return found
  })

// Every string the data holds (listings, records, demo users) and every dictionary value; both may appear in any language
const loadKnown = (page: Page) =>
  page.evaluate(async () => {
    const modules = await Promise.all(
      ['/src/data/treatments.ts', '/src/data/groups.ts', '/src/data/hashtags.ts', '/src/data/patients.ts', '/src/lib/navigator.ts', '/src/lib/auth.ts', '/src/i18n.ts']
        .map(path => import(/* @vite-ignore */ path)))
    const visited = new WeakSet<object>()
    const strings = (v: unknown): string[] => {
      if (typeof v === 'string') return [v]
      if (!v || typeof v !== 'object' || visited.has(v)) return []
      visited.add(v)
      return Object.values(v).flatMap(strings)
    }
    const { DICTS, PATIENTS, ...rest } = Object.assign({}, ...modules) as
      { DICTS: Record<string, unknown>; PATIENTS: { firstNames: string; lastName: string }[] }
    // Names are shown shortened (first given name + surname), so each part counts on its own
    const names = PATIENTS.flatMap(p => [...p.firstNames.split(' '), p.lastName])
    return { data: [...strings(rest), ...strings(PATIENTS), ...names], dicts: Object.fromEntries(Object.entries(DICTS).map(([lang, d]) => [lang, strings(d)])) }
  })

const login = async (page: Page, lang: Lang, role: Role) => {
  await page.goto(URL)
  await page.locator('.lang-switch button').nth(LANGS.indexOf(lang)).click()
  await page.locator('.role-option').nth(ROLE_INDEX[role]).click()
  await page.locator('form input').nth(0).fill(ACCOUNTS[role])
  await page.locator('form input').nth(1).fill('demo')
  await page.locator('form button[type=submit]').click()
  await page.waitForTimeout(1500)
}

// Each step returns the screens it passed through, by name
const sweep = async (page: Page, lang: Lang, role: Role) => {
  const screens: [string, string[]][] = []
  const snap = async (name: string) => screens.push([`${role}/${name}`, await collect(page)])
  await page.goto(URL)
  await page.locator('.lang-switch button').nth(LANGS.indexOf(lang)).click()
  await snap('login')
  await login(page, lang, role)
  await snap('start')
  if (role === 'professional') {
    await page.locator('form input').first().fill('Aino Virtanen')
    await page.locator('form button[type=submit]').first().click()
    await page.waitForTimeout(500)
    await snap('search')
    await page.locator('tbody tr').first().click()
    await page.locator('.modal input[type=checkbox]').first().check()
    const reason = page.locator('.modal select').first()
    await reason.selectOption({ index: (await reason.locator('option').count()) - 1 })
    await page.waitForTimeout(300)
    await snap('access')
    await page.locator('.modal button.primary:not([disabled])').last().click()
  } else {
    await page.locator('.self-service button.primary:not([disabled])').last().click()
  }
  await page.waitForTimeout(800)
  await snap('processing')
  await page.locator('.card').first().waitFor({ timeout: 30_000 })
  await snap('results')
  await page.locator('.card button.primary').first().click()
  await page.waitForTimeout(500)
  await snap('booking')
  return screens
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(URL)
const { data, dicts } = await loadKnown(page)
const runs = {} as Record<Lang, [string, string[]][]>
for (const lang of LANGS)
  runs[lang] = (await Promise.all((['professional', 'patient', 'proxy'] as Role[]).map(async role => {
    const p = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    try { return await sweep(p, lang, role) } finally { await p.close() }
  }))).flat()
await browser.close()

// A leak is text the Finnish run also shows that is left with words once data and the language's own dictionary are taken out
const finnish = new Set(runs.fi.flatMap(([, texts]) => texts))
// Units and record excerpts: evidence tooltips quote a sentence out of a longer record text
const NEUTRAL = ['km']
const quoted = (text: string) => data.some(d => d.length > text.length && d.includes(text))
const residue = (text: string, known: string[]) =>
  known.reduce((rest, k) => (k.length > 1 ? rest.split(k).join(' ') : rest), text)
let leaks = 0
for (const lang of ['sv', 'en'] as const) {
  const known = [...data, ...dicts[lang]!, ...NEUTRAL].sort((a, b) => b.length - a.length)
  const seen = new Set<string>()
  for (const [screen, texts] of runs[lang])
    for (const text of texts) {
      // Language codes (FI / SV) are the same in every language
      if (seen.has(text) || !finnish.has(text) || /^[A-Z]{2}( \/ [A-Z]{2})*$/.test(text)) continue
      seen.add(text)
      if (!quoted(text) && /\p{L}{2,}/u.test(residue(text, known))) {
        console.log(`${lang.toUpperCase()}  ${screen}  ${text}`)
        leaks++
      }
    }
}
console.log(leaks ? `${leaks} possible leaks` : 'No leaks found')
process.exit(leaks ? 1 : 0)
