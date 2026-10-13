import { useState, type FormEvent } from 'react'
import type { Patient } from '../data/patients'
import { searchPatients, type AccessReason, type SearchResult } from '../lib/registry'
import { useT } from '../i18n'
import { Modal } from './Modal'

const REASONS: AccessReason[] = ['careRelationship', 'referral', 'consultation']

export const PatientSearch = ({
  onOpen,
}: {
  onOpen: (patient: Patient, reason: AccessReason) => void
}) => {
  const { t } = useT()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Patient | null>(null)
  const [reason, setReason] = useState<AccessReason>('referral')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(await searchPatients(query))
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
        <Modal title={t.confirmTitle} onClose={() => setSelected(null)}>
          <p>{t.confirmIdentity}</p>
          <dl className="identity">
            <dt>{t.colName}</dt><dd>{selected.lastName}, {selected.firstNames}</dd>
            <dt>{t.colHetu}</dt><dd className="mono">{selected.hetu}</dd>
          </dl>
          <label>
            {t.reasonLabel}
            <select value={reason} onChange={e => setReason(e.target.value as AccessReason)}>
              {REASONS.map(r => <option key={r} value={r}>{t.reasons[r]}</option>)}
            </select>
          </label>
          <p className="hint">{t.auditNotice}</p>
          <div className="actions">
            <button className="secondary" onClick={() => setSelected(null)}>{t.cancel}</button>
            <button className="primary" onClick={() => onOpen(selected, reason)}>{t.openAndMatch}</button>
          </div>
        </Modal>
      )}
    </main>
  )
}
