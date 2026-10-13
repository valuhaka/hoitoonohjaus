import { useState, type FormEvent } from 'react'
import { authenticate, DEMO_PASSWORD, demoUsername, ROLES, type Role, type User } from '../lib/auth'
import { useT } from '../i18n'

export const Login = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const { t } = useT()
  const [role, setRole] = useState<Role>('professional')
  const [username, setUsername] = useState(demoUsername('professional'))
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [error, setError] = useState(false)
  const [strongAuthNotice, setStrongAuthNotice] = useState(false)

  const chooseRole = (next: Role) => {
    setRole(next)
    setUsername(demoUsername(next))
    setPassword(DEMO_PASSWORD)
    setError(false)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const user = authenticate(role, username, password)
    if (user) onLogin(user)
    else setError(true)
  }

  return (
    <main className="center">
      <section className="panel login">
        <h1>{t.loginTitle}</h1>
        <fieldset className="role-choice">
          <legend className="visually-hidden">{t.roleLabel}</legend>
          {ROLES.map(r => (
            <label key={r} className={r === role ? 'role-option active' : 'role-option'}>
              <input type="radio" name="role" value={r} checked={r === role} onChange={() => chooseRole(r)} />
              <strong>{t.roles[r]}</strong>
            </label>
          ))}
        </fieldset>

        {/* For show only: strong authentication goes through Suomi.fi or the professional card reader */}
        <button className="primary wide" onClick={() => setStrongAuthNotice(true)}>{t.strongAuth}</button>
        {strongAuthNotice && <p className="hint">{t.strongAuthDemo}</p>}

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
