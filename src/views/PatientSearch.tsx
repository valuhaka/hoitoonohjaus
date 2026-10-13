import { useState, type FormEvent } from 'react'
import type { Patient } from '../data/patients'
import type { User } from '../lib/auth'
import type { ExtractionInput } from '../lib/extraction'
import { searchPatients, type AccessReason, type SearchResult } from '../lib/registry'
import { useT } from '../i18n'
import { DataSources } from './DataSources'
import { Modal } from './Modal'

const REASONS: AccessReason[] = ['careRelationship', 'referral', 'consultation']

// Opening a record takes three explicit steps: acknowledge logging, give the basis, choose the data
const AccessDialog = ({
  patient,
  onOpen,
  onClose,
}: {
  patient: Patient
  onOpen: (input: ExtractionInput, reason: AccessReason) => void
  onClose: () => void
}) => {
  const { t } = useT()
  const [acknowledged, setAcknowledged] = useState(false)
  const [reason, setReason] = useState<AccessReason | ''>('')

  return (
    <Modal title={t.confirmTitle} onClose={onClose} wide>
      <p>{t.confirmIdentity}</p>
      <dl className="identity">
        <dt>{t.colName}</dt><dd>{patient.lastName}, {patient.firstNames}</dd>
        <dt>{t.colHetu}</dt><dd className="mono">{patient.hetu}</dd>
      </dl>
      <label className="check acknowledge">
        <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />
        <span>{t.logAck}</span>
      </label>
      <label className={acknowledged ? undefined : 'disabled'}>
        {t.reasonLabel}
        <select value={reason} disabled={!acknowledged} onChange={e => setReason(e.target.value as AccessReason)}>
          <option value="" disabled>{t.reasonPlaceholder}</option>
          {REASONS.map(r => <option key={r} value={r}>{t.reasons[r]}</option>)}
        </select>
      </label>
      <DataSources patient={patient} role="professional" disabled={!acknowledged || reason === ''}
        actions={input => (
          <div className="actions">
            <button className="secondary" onClick={onClose}>{t.cancel}</button>
            <button className="primary" disabled={!input || reason === ''}
              onClick={() => input && reason !== '' && onOpen(input, reason)}>
              {t.openAndMatch}
            </button>
          </div>
        )} />
    </Modal>
  )
}

export const PatientSearch = ({
  user,
  onOpen,
}: {
  user: User
  onOpen: (input: ExtractionInput, reason: AccessReason) => void
}) => {
  const { t } = useT()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Patient | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(await searchPatients(query, user))
    setLoading(false)
  }

  return (
    <main className="content">
      <section className="panel">
        <h1>{t.searchTitle}</h1>
        <form className="search-row" onSubmit={submit}>
          <label className="grow">
            {t.searchLabel}
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
            />
          </label>
          <button className="primary" type="submit" disabled={loading || !query.trim()}>
            {loading ? <span className="spinner small" /> : t.search}
          </button>
        </form>

        {result?.kind === 'invalid' && <p className="error">{t[result.message]}</p>}
        {result?.kind === 'found' && result.patients.length === 0 && <p className="hint">{t.noResults}</p>}
        {result?.kind === 'found' && result.patients.length > 0 && (
          <table className="results-table">
            <thead>
              <tr><th>{t.colName}</th><th>{t.colHetu}</th><th>{t.colMunicipality}</th></tr>
            </thead>
            <tbody>
              {result.patients.map(p => (
                <tr key={p.hetu} onClick={() => setSelected(p)} tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setSelected(p)}>
                  <td>{p.lastName}, {p.firstNames}</td>
                  <td className="mono">{p.hetu}</td>
                  <td>{p.nonDisclosure ? <span className="badge danger">{t.nonDisclosure}</span> : p.municipality}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {selected && (
        <AccessDialog key={selected.hetu} patient={selected} onOpen={onOpen} onClose={() => setSelected(null)} />
      )}
    </main>
  )
}
