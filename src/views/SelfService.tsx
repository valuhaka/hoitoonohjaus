import { useState } from 'react'
import { ownPatients, type User } from '../lib/auth'
import type { ExtractionInput } from '../lib/extraction'
import { useT } from '../i18n'
import { DataSources } from './DataSources'
import { PatientBanner } from './PatientBanner'

// Patients see only themselves; proxies choose among the persons they may act for. No search.
export const SelfService = ({ user, onStart }: { user: User; onStart: (input: ExtractionInput) => void }) => {
  const { t } = useT()
  const patients = ownPatients(user)
  const [hetu, setHetu] = useState(patients[0]?.hetu ?? '')
  const patient = patients.find(p => p.hetu === hetu)

  return (
    <section className="panel self-service">
      <h1>{user.role === 'proxy' ? t.proxyTitle : t.selfTitle}</h1>
      {user.role === 'proxy' && (
        <label>
          {t.proxyChoose}
          <select value={hetu} onChange={e => setHetu(e.target.value)}>
            {patients.map(p => <option key={p.hetu} value={p.hetu}>{p.lastName}, {p.firstNames}</option>)}
          </select>
        </label>
      )}
      {patient && (
        <>
          <PatientBanner patient={patient} />
          <DataSources key={patient.hetu} patient={patient} role={user.role}
            actions={input => (
              <div className="actions">
                <button className="primary" disabled={!input} onClick={() => input && onStart(input)}>
                  {t.findGroups}
                </button>
              </div>
            )} />
        </>
      )}
    </section>
  )
}
