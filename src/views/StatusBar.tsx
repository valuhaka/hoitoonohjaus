import { formatTime, useT } from '../i18n'
import type { User } from '../lib/auth'

const clock = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

// Classic desktop status bar: connection, last sync and signed-in user
export const StatusBar = ({ user, syncedAt }: { user: User; syncedAt: Date }) => {
  const { t, lang } = useT()
  return (
    <footer className="statusbar">
      <span><span className="status-light" aria-hidden="true" />{t.status.connected}</span>
      <span>{t.status.synced(formatTime(clock(syncedAt), lang))}</span>
      <span>{user.title ? `${user.name} · ${user.title}` : user.name}</span>
    </footer>
  )
}
