import { useCallback, useState } from 'react'
import type { Patient } from './data/patients'
import { mockExtractor, type Extraction } from './lib/extraction'
import { logAccess, type AccessReason, type AuditEntry } from './lib/registry'
import { DICTS, I18n, type Lang } from './i18n'
import { Login, type User } from './views/Login'
import { PatientSearch } from './views/PatientSearch'
import { Processing } from './views/Processing'
import { Results } from './views/Results'

type Screen =
  | { name: 'search' }
  | { name: 'processing'; patient: Patient }
  | { name: 'results'; patient: Patient; extraction: Extraction }

export const App = () => {
  const [lang, setLang] = useState<Lang>('fi')
  const [user, setUser] = useState<User | null>(null)
  const [screen, setScreen] = useState<Screen>({ name: 'search' })
  const [, setAudit] = useState<AuditEntry[]>([])
  const t = DICTS[lang]

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
          <span className="logo">◆</span>
          <div>
            <strong>{t.appName}</strong>
            <small>{t.org}</small>
          </div>
          <span className="badge demo">{t.demoBadge}</span>
        </div>
        <div className="topbar-right">
          <button className="link" onClick={() => setLang(lang === 'fi' ? 'en' : 'fi')}>
            {lang === 'fi' ? 'EN' : 'FI'}
          </button>
          {user && (
            <>
              <span className="user">{user.name} · {user.title}</span>
              <button className="link" onClick={logout}>{t.logout}</button>
            </>
          )}
        </div>
      </header>

      {!user && <Login onLogin={setUser} />}
      {user && screen.name === 'search' && <PatientSearch onOpen={open} />}
      {user && screen.name === 'processing' && (
        <Processing patient={screen.patient} extractor={mockExtractor} onDone={onExtracted} />
      )}
      {user && screen.name === 'results' && (
        <Results patient={screen.patient} extraction={screen.extraction}
          onNewSearch={() => setScreen({ name: 'search' })} />
      )}
    </I18n.Provider>
  )
}
