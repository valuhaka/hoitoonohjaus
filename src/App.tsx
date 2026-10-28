import { useCallback, useEffect, useState } from 'react'
import { CATALOGUE, REAL_GROUPS } from './data/listings'
import { canAccess, type User } from './lib/auth'
import { mockExtractor, type Extraction, type ExtractionInput } from './lib/extraction'
import { logAccess, type AccessReason, type AuditEntry } from './lib/registry'
import { DICTS, I18n, LANGS, type Lang } from './i18n'
import { Login } from './views/Login'
import { PatientSearch } from './views/PatientSearch'
import { Processing } from './views/Processing'
import { Results } from './views/Results'
import { SelfService } from './views/SelfService'
import { StatusBar } from './views/StatusBar'
import { TopBar } from './views/TopBar'
import { TreatmentBrowser } from './views/TreatmentBrowser'

// The chosen language survives a reload; storage may be blocked, so Finnish is the fallback
const LANG_KEY = 'psyykkeri.lang'
const storedLang = (): Lang => {
  try {
    const value = localStorage.getItem(LANG_KEY)
    return LANGS.find(l => l === value) ?? 'fi'
  } catch {
    return 'fi'
  }
}

type Screen =
  | { name: 'start' }
  | { name: 'processing'; input: ExtractionInput }
  | { name: 'results'; input: ExtractionInput; extraction: Extraction }

export const App = () => {
  const [lang, setLang] = useState<Lang>(storedLang)
  const [user, setUser] = useState<User | null>(null)
  const [syncedAt, setSyncedAt] = useState(() => new Date())
  const [screen, setScreen] = useState<Screen>({ name: 'start' })
  const [, setAudit] = useState<AuditEntry[]>([])
  const t = DICTS[lang]

  useEffect(() => {
    document.documentElement.lang = lang
    try { localStorage.setItem(LANG_KEY, lang) } catch { /* not remembered */ }
  }, [lang])

  const open = (input: ExtractionInput, reason: AccessReason | 'own' | 'proxy') => {
    if (!user || !canAccess(user, input.patient.hetu)) return
    setAudit(log => logAccess(log, { user: user.name, hetu: input.patient.hetu, reason }))
    setScreen({ name: 'processing', input })
  }

  const onExtracted = useCallback(
    (extraction: Extraction) =>
      setScreen(s => (s.name === 'processing' ? { name: 'results', input: s.input, extraction } : s)),
    [],
  )

  // The browser sits just below the first screen; the button scrolls to it and hands focus to its heading
  const toBrowser = () => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('browser')?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
    document.getElementById('browser-title')?.focus({ preventScroll: true })
  }

  const logout = () => {
    setUser(null)
    setScreen({ name: 'start' })
  }

  return (
    <I18n.Provider value={{ t, lang }}>
      <TopBar user={user} onLang={setLang} onHome={() => setScreen({ name: 'start' })} onLogout={logout} />

      {!user && <Login onLogin={u => { setUser(u); setSyncedAt(new Date()) }} />}
      {user && screen.name === 'start' && (
        <main className="content wide home">
          {/* The search fills the first screen; the browser starts just below it, and the button at the bottom scrolls there */}
          <div className="home-hero">
            {user.role === 'professional'
              ? <PatientSearch user={user} onOpen={open} />
              : <SelfService user={user} onStart={input => open(input, user.role === 'proxy' ? 'proxy' : 'own')} />}
            <button className="primary browse-button" onClick={toBrowser}>{t.browser.title}</button>
          </div>
          <TreatmentBrowser groups={CATALOGUE} referrer={user.name} />
        </main>
      )}
      {user && screen.name === 'processing' && (
        <Processing input={screen.input} extractor={mockExtractor} onDone={onExtracted} />
      )}
      {user && screen.name === 'results' && (
        <Results patient={screen.input.patient} extraction={screen.extraction} groups={REAL_GROUPS} user={user}
          onNewSearch={() => setScreen({ name: 'start' })} />
      )}
      <StatusBar user={user} syncedAt={syncedAt} />
    </I18n.Provider>
  )
}
