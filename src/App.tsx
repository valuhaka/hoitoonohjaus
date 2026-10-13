import { useCallback, useEffect, useState } from 'react'
import { LISTINGS, type DataSource } from './data/listings'
import type { Patient } from './data/patients'
import { mockExtractor, type Extraction } from './lib/extraction'
import { logAccess, type AccessReason, type AuditEntry } from './lib/registry'
import { DICTS, I18n, LANGS, type Lang } from './i18n'
import { Login, type User } from './views/Login'
import { PatientSearch } from './views/PatientSearch'
import { Processing } from './views/Processing'
import { Results } from './views/Results'
import { StatusBar } from './views/StatusBar'

type Screen =
  | { name: 'search' }
  | { name: 'processing'; patient: Patient }
  | { name: 'results'; patient: Patient; extraction: Extraction }

export const App = () => {
  const [lang, setLang] = useState<Lang>('fi')
  const [dataSource, setDataSource] = useState<DataSource>('synthetic')
  const [user, setUser] = useState<User | null>(null)
  const [syncedAt, setSyncedAt] = useState(() => new Date())
  const [screen, setScreen] = useState<Screen>({ name: 'search' })
  const [, setAudit] = useState<AuditEntry[]>([])
  const t = DICTS[lang]

  useEffect(() => { document.documentElement.lang = lang }, [lang])

  const open = (patient: Patient, reason: AccessReason) => {
    setAudit(log => logAccess(log, { user: user?.name ?? '', hetu: patient.hetu, reason }))
    setScreen({ name: 'processing', patient })
  }

  const onExtracted = useCallback(
    (extraction: Extraction) =>
      setScreen(s => (s.name === 'processing' ? { name: 'results', patient: s.patient, extraction } : s)),
    [],
  )

  const logout = () => {
    setUser(null)
    setScreen({ name: 'search' })
  }

  return (
    <I18n.Provider value={{ t, lang }}>
      <header className="topbar">
        <div className="brand">
          <div>
            <strong>{t.appName}</strong>
            <small>{t.org}</small>
          </div>
          <button className={`badge data-switch ${dataSource}`} role="switch" aria-checked={dataSource === 'real'}
            title={t.dataSource.toggle} onClick={() => setDataSource(s => (s === 'real' ? 'synthetic' : 'real'))}>
            <span className="switch-track" aria-hidden="true"><span className="switch-knob" /></span>
            {t.dataSource[dataSource]}
          </button>
        </div>
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
      {user && screen.name === 'search' && <PatientSearch onOpen={open} />}
      {user && screen.name === 'processing' && (
        <Processing patient={screen.patient} extractor={mockExtractor} onDone={onExtracted} />
      )}
      {user && screen.name === 'results' && (
        <Results patient={screen.patient} extraction={screen.extraction} groups={LISTINGS[dataSource]} referrer={user.name}
          onNewSearch={() => setScreen({ name: 'search' })} />
      )}
      {user && <StatusBar user={user} syncedAt={syncedAt} />}
    </I18n.Provider>
  )
}
