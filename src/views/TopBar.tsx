import { useEffect, useRef, useState } from 'react'
import type { User } from '../lib/auth'
import { LANGS, useT, type Lang } from '../i18n'

// Wide screens: home button left, logo and wordmark centred, languages and logout right.
// Narrow screens: a menu button left of the wordmark; the same controls open as a panel under the bar.
export const TopBar = ({
  user,
  onLang,
  onHome,
  onLogout,
}: {
  user: User | null
  onLang: (lang: Lang) => void
  onHome: () => void
  onLogout: () => void
}) => {
  const { t, lang } = useT()
  const [open, setOpen] = useState(false)
  const bar = useRef<HTMLElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)

  // Escape and a click outside close the menu; Escape returns focus to the menu button
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      toggle.current?.focus()
    }
    const onClick = (e: MouseEvent) => {
      if (!bar.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [open])

  // Every action in the menu also closes it
  const then = (action: () => void) => () => {
    setOpen(false)
    action()
  }

  return (
    <header ref={bar} className={open ? 'topbar menu-open' : 'topbar'}>
      <button ref={toggle} className="menu-toggle" aria-expanded={open} aria-controls="topbar-menu"
        aria-label={open ? t.menu.close : t.menu.open} onClick={() => setOpen(o => !o)}>
        <span className="menu-bars" aria-hidden="true"><span /><span /><span /></span>
      </button>
      <strong className="brand"><img className="brand-logo" src="/logo/doctorcat.png" alt="" />{t.appName}</strong>
      <div id="topbar-menu" className="topbar-menu">
        <div className="topbar-left">
          {user && <button className="secondary home-button" onClick={then(onHome)}>{t.backHome}</button>}
        </div>
        <div className="topbar-right">
          <div className="lang-switch" role="group" aria-label={t.langSwitch}>
            {LANGS.map(l => (
              <button key={l} className={l === lang ? 'segment active' : 'segment'}
                aria-pressed={l === lang} onClick={then(() => onLang(l))}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          {user && <button className="link" onClick={then(onLogout)}>{t.logout}</button>}
        </div>
      </div>
    </header>
  )
}
