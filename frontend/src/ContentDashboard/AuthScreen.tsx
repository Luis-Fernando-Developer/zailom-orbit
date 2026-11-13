import { useState, type FormEvent } from 'react'
import { Orbit } from 'lucide-react'
import { ApiError, register, signIn, type AuthUser } from '@/lib/api'

interface AuthScreenProps {
  onAuthenticated: (user: AuthUser) => void
}

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const user = mode === 'login'
        ? await signIn(email, password)
        : await register(name, email, password)
      onAuthenticated(user)
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : 'Não foi possível autenticar. Tente novamente.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand">
          <span><Orbit size={22} aria-hidden="true" /></span>
          <strong>Zailom Orbit</strong>
        </div>
        <p className="auth-eyebrow">SEU WORKSPACE DE CONTEÚDO</p>
        <h1>{mode === 'login' ? 'Boas-vindas de volta' : 'Crie sua conta'}</h1>
        <p className="auth-description">
          {mode === 'login'
            ? 'Entre para continuar organizando suas redes.'
            : 'Comece a organizar suas redes em um só lugar.'}
        </p>

        <div className="auth-fields">
          {mode === 'register' && (
            <label>
              Nome
              <input
                autoComplete="name"
                maxLength={80}
                minLength={2}
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </label>
          )}
          <label>
            E-mail
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Senha
            <input
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              maxLength={128}
              minLength={mode === 'login' ? 1 : 10}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
            {mode === 'register' && <small>Use pelo menos 10 caracteres.</small>}
          </label>
        </div>

        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="auth-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
        <p className="auth-switch">
          {mode === 'login' ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}
          {' '}
          <button
            onClick={() => {
              setMode((current) => current === 'login' ? 'register' : 'login')
              setError('')
            }}
            type="button"
          >
            {mode === 'login' ? 'Criar conta' : 'Entrar'}
          </button>
        </p>
      </form>
    </main>
  )
}
