import { useState } from 'react'
import { ADAPTERS } from '../lib/booking'
import type { Match } from '../lib/match'
import { formatDate, formatFee, useT } from '../i18n'
import { distanceText, languagesText, scheduleText } from './format'
import { Modal } from './Modal'

type Status =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'done'; reference: string }
  | { kind: 'failed' }

export const BookingDialog = ({
  match,
  referrer,
  onReserved,
  onClose,
}: {
  match: Match
  referrer: string
  onReserved: (reference: string) => void
  onClose: () => void
}) => {
  const { t, lang } = useT()
  const { group, distanceKm, seatsLeft } = match
  const { booking, contact } = group
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const reserve = async () => {
    if (booking.type !== 'integrated') return
    setStatus({ kind: 'pending' })
    try {
      const { reference } = await ADAPTERS[booking.adapter]({ groupId: group.id, referrer })
      setStatus({ kind: 'done', reference })
      onReserved(reference)
    } catch {
      setStatus({ kind: 'failed' })
    }
  }

  return (
    <Modal onClose={onClose} labelledBy="booking-title" wide>
      <div>
        <h2 id="booking-title">{group.name}</h2>
        <p className="organiser">{group.organiser}</p>
      </div>

      <dl className="details">
        <dt>{t.booking.method}</dt><dd>{group.method}</dd>
        <dt>{t.booking.location}</dt><dd>{group.address} · {distanceText(distanceKm, lang)}</dd>
        <dt>{t.booking.schedule}</dt>
        <dd>{t.starts} {formatDate(group.startDate, lang)} · {scheduleText(group, lang)} · {t.sessions(group.sessions)}</dd>
        <dt>{t.booking.languages}</dt><dd>{languagesText(group)}</dd>
        <dt>{t.booking.cost}</dt><dd>{formatFee(group.fee, lang)}</dd>
        <dt>{t.booking.seats}</dt><dd>{t.seatsLeft(seatsLeft)}</dd>
        {booking.type !== 'contact' && <><dt>{t.booking.system}</dt><dd>{booking.system}</dd></>}
      </dl>

      <section className="contact">
        <h3>{t.booking.contact}</h3>
        <p><strong>{contact.name}</strong>, {contact.role}</p>
        <p><a href={`tel:${contact.phone.replace(/\s/g, '')}`}>{contact.phone}</a></p>
        <p><a href={`mailto:${contact.email}`}>{contact.email}</a></p>
      </section>

      {booking.type === 'contact' && <p className="hint">{t.booking.contactOnly}</p>}
      {status.kind === 'done' && (
        <p className="success">{t.booking.done} <strong className="mono">{status.reference}</strong></p>
      )}
      {status.kind === 'failed' && <p className="error">{t.booking.failed}</p>}

      <div className="actions">
        {booking.type === 'contact' && <button className="primary" onClick={onClose}>{t.close}</button>}

        {booking.type === 'external' && (
          <>
            <button className="secondary" onClick={onClose}>{t.close}</button>
            <a className="button primary" href={booking.url} target="_blank" rel="noopener noreferrer">
              {t.booking.openExternal(booking.system)}
            </a>
          </>
        )}

        {booking.type === 'integrated' && (status.kind === 'done' || status.kind === 'failed'
          ? <button className="primary" onClick={onClose}>{t.close}</button>
          : (
            <>
              <button className="secondary" onClick={onClose} disabled={status.kind === 'pending'}>{t.cancel}</button>
              <button className="primary" onClick={reserve} disabled={status.kind === 'pending' || seatsLeft === 0}>
                {status.kind === 'pending' ? <><span className="spinner small" /> {t.booking.pending}</> : t.booking.confirm}
              </button>
            </>
          ))}
      </div>
    </Modal>
  )
}
