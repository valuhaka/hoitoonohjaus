import { useState, type FormEvent } from 'react'
import { useT } from '../i18n'

export type User = { name: string; title: string }

// Demo accounts only; production uses the organisation's identity provider
const DEMO_USER: User = { name: 'Iiris Ainias', title: 'Psykologi' }

export const Login = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const { t } = useT()
  const [username, setUsername] = useState('demo')
  const [password, setPassword] = useState('demo')
  const [error, setError] = useState(false)
  const [cardPending, setCardPending] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (username === 'demo' && password === 'demo') onLogin(DEMO_USER)
    else setError(true)
  }

  const cardLogin = () => {
    setCardPending(true)
    setTimeout(() => onLogin(DEMO_USER), 1200)
  }

  return (
    <main className="center">
      <section className="panel login">
        <h1>{t.loginTitle}</h1>
        <button className="primary wide" onClick={cardLogin} disabled={cardPending}>
          {cardPending && <span className="spinner small" />} {t.loginCard}
        </button>
        <div className="divider">{t.loginOr}</div>
        <form onSubmit={submit}>
          <label>
            {t.username}
            <input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
          </label>
          <label>
            {t.password}
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && <p className="error">{t.loginError}</p>}
          <button className="secondary wide" type="submit">{t.loginSubmit}</button>
        </form>
      </section>
    </main>
  )
}
