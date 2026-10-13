import { useEffect, useId, type ReactNode } from 'react'
import { useT } from '../i18n'

// Window-like dialog: a title bar with the title and a close button, then the body
export const Modal = ({
  title,
  onClose,
  wide,
  children,
}: {
  title: string
  onClose: () => void
  wide?: boolean
  children: ReactNode
}) => {
  const { t } = useT()
  const titleId = useId()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={wide ? 'modal wide' : 'modal'} role="dialog" aria-modal="true"
        aria-labelledby={titleId} onClick={e => e.stopPropagation()}>
        <header className="titlebar">
          <h2 id={titleId}>{title}</h2>
          <button className="titlebar-close" aria-label={t.close} onClick={onClose}>×</button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
