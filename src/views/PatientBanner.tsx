import type { Patient } from '../data/patients'
import { ageAt } from '../lib/hetu'
import { useT } from '../i18n'

export const PatientBanner = ({ patient }: { patient: Patient }) => {
  const { t } = useT()
  return (
    <div className="patient-banner">
      <strong>{patient.lastName}, {patient.firstNames}</strong>
      <span className="mono">{patient.hetu}</span>
      <span>{t.age(ageAt(patient.hetu, new Date()))}</span>
      {patient.nonDisclosure
        ? <span className="badge danger">{t.nonDisclosure}</span>
        : <span>{patient.municipality}</span>}
    </div>
  )
}
