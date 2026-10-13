import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { REGISTER_IDS, type Patient, type RegisterId } from '../data/patients'
import type { Role } from '../lib/auth'
import type { ExtractionInput } from '../lib/extraction'
import { ageAt } from '../lib/hetu'
import { lookupNavigatorCode, NAVIGATOR_IDS, NAVIGATORS, navigatorForAge, type NavigatorId } from '../lib/navigator'
import { useT } from '../i18n'

// Kanta holds other providers' entries; using them needs the patient's consent, so it starts unchecked
const OFF_BY_DEFAULT: RegisterId[] = ['kanta']

const Checkbox = ({ checked, indeterminate, onChange, children }: {
  checked: boolean
  indeterminate?: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
}) => {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate }, [indeterminate])
  return (
    <label className="check">
      <input ref={ref} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  )
}

const OptionalTag = () => {
  const { t } = useT()
  return <span className="optional-tag">{t.optional}</span>
}

// Chooses exactly which data the matching may use: registers (at least one), then optional extras,
// then a summary of exactly that. `actions` gets the input to run, or null while no register is chosen.
export const DataSources = ({
  patient,
  role,
  actions,
}: {
  patient: Patient
  role: Role
  actions: (input: ExtractionInput | null) => ReactNode
}) => {
  const { t } = useT()
  const ids = useId()
  const firstName = patient.firstNames.split(' ')[0]!
  const example = role === 'proxy' ? t.freeTextExample.proxy(firstName) : t.freeTextExample[role]
  const prompt = role === 'proxy' ? t.chatPrompt.proxy(firstName) : t.chatPrompt[role]

  const counts = REGISTER_IDS
    .map(id => ({ id, entries: patient.record.filter(e => e.register === id).length }))
    .filter(r => r.entries > 0)
  const defaults = counts.map(r => r.id).filter(id => !OFF_BY_DEFAULT.includes(id))

  const [registers, setRegisters] = useState<RegisterId[]>(defaults)
  const [freeText, setFreeText] = useState('')
  const [navigator, setNavigator] = useState<NavigatorId>(navigatorForAge(ageAt(patient.hetu, new Date())))
  const [code, setCode] = useState('')

  const ownWords = freeText.trim()
  const lookup = code.trim() === '' ? null : lookupNavigatorCode(navigator, code)
  const navigatorResult = lookup?.kind === 'found' ? lookup.result : null
  const entries = counts.filter(r => registers.includes(r.id)).reduce((n, r) => n + r.entries, 0)

  const input: ExtractionInput | null = registers.length > 0
    ? { patient, registers, freeText: ownWords, navigator: navigatorResult }
    : null

  const toggle = (id: RegisterId, on: boolean) =>
    setRegisters(rs => (on ? [...rs, id] : rs.filter(r => r !== id)))
  const allOn = counts.every(r => registers.includes(r.id))

  return (
    <>
      <section className="sources">
        <h3>{role === 'patient' ? t.useRecords.own : t.useRecords.professional}</h3>
        <Checkbox checked={registers.length > 0} indeterminate={registers.length > 0 && !allOn}
          onChange={on => setRegisters(on ? counts.map(r => r.id) : [])}>
          {t.allRegisters}
        </Checkbox>
        <div className="sub-checks">
          {counts.map(r => (
            <Checkbox key={r.id} checked={registers.includes(r.id)} onChange={on => toggle(r.id, on)}>
              {t.registers[r.id]}{' '}
              <small className="hint">
                {t.entries(r.entries)}{OFF_BY_DEFAULT.includes(r.id) && role !== 'patient' && ` · ${t.kantaConsent}`}
              </small>
            </Checkbox>
          ))}
        </div>
        {registers.length === 0 && <p className="error">{t.needRegister}</p>}
      </section>

      <section className="sources optional">
        <h3>{t.optionalTitle}</h3>
        <div className="source chat">
          <label htmlFor={`${ids}-text`}>{t.freeText} <OptionalTag /></label>
          <p className="chat-prompt">{prompt}</p>
          <textarea id={`${ids}-text`} className="chat-input" rows={3} value={freeText} placeholder={example}
            onChange={e => setFreeText(e.target.value)} />
        </div>
        <div className="source">
          <label htmlFor={`${ids}-code`}>{t.navigatorCode} <OptionalTag /></label>
          <div className="navigator-row">
            <select aria-label={t.navigatorCode} value={navigator} onChange={e => setNavigator(e.target.value as NavigatorId)}>
              {NAVIGATOR_IDS.map(id => <option key={id} value={id}>{NAVIGATORS[id].name}</option>)}
            </select>
            <input id={`${ids}-code`} className="mono" inputMode="numeric" placeholder="0000 0000"
              value={code} onChange={e => setCode(e.target.value)} />
          </div>
          <p className="hint">
            {t.navigatorHint} ·{' '}
            {NAVIGATOR_IDS.map((id, i) => (
              <span key={id}>
                {i > 0 && ' · '}
                <a href={NAVIGATORS[id].url} target="_blank" rel="noopener noreferrer">{NAVIGATORS[id].name}</a>
              </span>
            ))}
          </p>
          {lookup?.kind === 'found' && <p className="ok">{t.navigatorLookup.found(lookup.result.tags.length)}</p>}
          {lookup && lookup.kind !== 'found' && <p className="error">{t.navigatorLookup[lookup.kind]}</p>}
        </div>
      </section>

      {input && (
        <div className="summary" aria-live="polite">
          <strong>{t.summaryTitle}</strong>
          <ul>
            <li>{t.summary.identity}</li>
            <li>{t.summary.records(entries, registers.length)}</li>
            {ownWords !== '' && <li>{t.summary.freeText}</li>}
            {navigatorResult && <li>{t.summary.navigator(NAVIGATORS[navigatorResult.navigator].name)}</li>}
          </ul>
          <p className="hint">{t.purpose}</p>
        </div>
      )}

      {actions(input)}
    </>
  )
}
