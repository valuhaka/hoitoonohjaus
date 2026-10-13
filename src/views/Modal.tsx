import { useEffect, type ReactNode } from 'react'

export const Modal = ({
  onClose,
  labelledBy,
  wide,
  children,
}: {
  onClose: () => void
  labelledBy: string
  wide?: boolean
  children: ReactNode
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={wide ? 'panel modal wide' : 'panel modal'} role="dialog" aria-modal="true"
        aria-labelledby={labelledBy} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
