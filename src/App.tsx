import { useCallback, useEffect, useMemo, useState } from 'react'
import { CATALOGUE, LISTINGS, type DataSource } from './data/listings'
import { canAccess, type User } from './lib/auth'
import { mockExtractor, withFallback, type Extraction, type ExtractionInput } from './lib/extraction'
import { completeWith, DEFAULT_MODEL, hasWebGPU, loadModel, modelName } from './lib/llm/engine'
import { createJudge, createModelExtractor } from './lib/llm/semantic'
import { logAccess, type AccessReason, type AuditEntry } from './lib/registry'
import { DICTS, I18n, LANGS, type Lang } from './i18n'
import { Login } from './views/Login'
import { ModelCompare } from './views/ModelCompare'
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
  const [ai, setAi] = useState(hasWebGPU)
  // Developer page that runs every model on the synthetic patients
  const [comparing, setComparing] = useState(() => location.hash === '#vertailu')
  const t = DICTS[lang]

  useEffect(() => { document.documentElement.lang = lang }, [lang])
  useEffect(() => {
    const onHash = () => setComparing(location.hash === '#vertailu')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Start the download at login so the model is ready by the time a patient is opened
  useEffect(() => { if (user && ai) loadModel().catch(() => undefined) }, [user, ai])

  const extractor = useMemo(() => {
    if (!ai) return mockExtractor
    const llm = createModelExtractor(completeWith(DEFAULT_MODEL), `webllm:${DEFAULT_MODEL}`)
    return withFallback(llm, mockExtractor)
  }, [ai])
  const judge = useMemo(() => (ai ? createJudge(completeWith(DEFAULT_MODEL)) : undefined), [ai])

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
          <button className={`badge data-switch ${ai ? 'on' : ''}`} role="switch" aria-checked={ai}
            disabled={!hasWebGPU()} title={hasWebGPU() ? t.ai.toggle : t.ai.noWebGPU} onClick={() => setAi(on => !on)}>
            <span className="switch-track" aria-hidden="true"><span className="switch-knob" /></span>
            {ai ? t.ai.on(modelName(DEFAULT_MODEL)) : t.ai.off}
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

      {comparing && <ModelCompare />}
      {!comparing && !user && <Login onLogin={u => { setUser(u); setSyncedAt(new Date()) }} />}
      {!comparing && user && screen.name === 'start' && (
        <main className="content wide home">
          {user.role === 'professional'
            ? <PatientSearch user={user} onOpen={open} />
            : <SelfService user={user} onStart={input => open(input, user.role === 'proxy' ? 'proxy' : 'own')} />}
          <TreatmentBrowser groups={CATALOGUE[dataSource]} referrer={user.name} />
        </main>
      )}
      {!comparing && user && screen.name === 'processing' && (
        <Processing input={screen.input} extractor={extractor} judge={judge} groups={LISTINGS[dataSource]}
          onDone={onExtracted} />
      )}
      {!comparing && user && screen.name === 'results' && (
        <Results patient={screen.input.patient} extraction={screen.extraction} groups={LISTINGS[dataSource]} user={user}
          onNewSearch={() => setScreen({ name: 'start' })} />
      )}
      <StatusBar user={user} syncedAt={syncedAt} />
    </I18n.Provider>
  )
}
