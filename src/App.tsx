import { useCallback, useEffect, useState } from 'react'
import { CATALOGUE, LISTINGS, type DataSource } from './data/listings'
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
import { TreatmentBrowser } from './views/TreatmentBrowser'

type Screen =
  | { name: 'start' }
  | { name: 'processing'; input: ExtractionInput }
  | { name: 'results'; input: ExtractionInput; extraction: Extraction }

export const App = () => {
  const [lang, setLang] = useState<Lang>('fi')
  const [dataSource, setDataSource] = useState<DataSource>('synthetic')
  const [user, setUser] = useState<User | null>(null)
  const [syncedAt, setSyncedAt] = useState(() => new Date())
  const [screen, setScreen] = useState<Screen>({ name: 'start' })
  const [, setAudit] = useState<AuditEntry[]>([])
  const t = DICTS[lang]

  useEffect(() => { document.documentElement.lang = lang }, [lang])

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

  const logout = () => {
    setUser(null)
    setScreen({ name: 'start' })
  }

  return (
    <I18n.Provider value={{ t, lang }}>
      <header className="topbar">
        <div className="topbar-left">
          {user && <button className="secondary home-button" onClick={() => setScreen({ name: 'start' })}>{t.backHome}</button>}
          <button className={`badge data-switch ${dataSource}`} role="switch" aria-checked={dataSource === 'real'}
            title={t.dataSource.toggle} onClick={() => setDataSource(s => (s === 'real' ? 'synthetic' : 'real'))}>
            <span className="switch-track" aria-hidden="true"><span className="switch-knob" /></span>
            {t.dataSource[dataSource]}
          </button>
        </div>
        <strong className="brand">{t.appName}</strong>
        <div className="topbar-right">
          <div className="lang-switch" role="group" aria-label="Kieli / Språk / Language">
            {LANGS.map(l => (
              <button key={l} className={l === lang ? 'segment active' : 'segment'}
                aria-pressed={l === lang} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          {user && <button className="link" onClick={logout}>{t.logout}</button>}
        </div>
      </header>

      {!user && <Login onLogin={u => { setUser(u); setSyncedAt(new Date()) }} />}
      {user && screen.name === 'start' && (
        <main className="content wide home">
          {user.role === 'professional'
            ? <PatientSearch user={user} onOpen={open} />
            : <SelfService user={user} onStart={input => open(input, user.role === 'proxy' ? 'proxy' : 'own')} />}
          <TreatmentBrowser groups={CATALOGUE[dataSource]} referrer={user.name} />
        </main>
      )}
      {user && screen.name === 'processing' && (
        <Processing input={screen.input} extractor={mockExtractor} onDone={onExtracted} />
      )}
      {user && screen.name === 'results' && (
        <Results patient={screen.input.patient} extraction={screen.extraction} groups={LISTINGS[dataSource]} user={user}
          onNewSearch={() => setScreen({ name: 'start' })} />
      )}
      <StatusBar user={user} syncedAt={syncedAt} />
    </I18n.Provider>
  )
}
