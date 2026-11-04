import { useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, KanbanSquare, Lock, Mail, ShieldCheck, User as UserIcon, Zap } from 'lucide-react';
import { toast } from 'react-toastify';
import { loginSchema, registerSchema, type User } from '../../../shared/auth';
import { api } from '../api';

type Mode = 'login' | 'register';

const POINTS = [
  { icon: KanbanSquare, text: 'Plan on a board or a list' },
  { icon: Zap, text: 'Add a task in one line' },
  { icon: ShieldCheck, text: 'Your tasks stay private to you' },
];

export function AuthPage({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const registering = mode === 'register';

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = registering
      ? registerSchema.safeParse({ name, email, password })
      : loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { user } = registering
        ? await api.register({ name, email, password })
        : await api.login({ email, password });
      toast.success(registering ? `Welcome to TaskTrack, ${user.name}` : `Welcome back, ${user.name}`);
      onAuthenticated(user);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <section className="auth-side">
        <div className="brand brand-light">
          <span className="brand-mark" aria-hidden="true">
            <CheckCircle2 size={16} strokeWidth={2.75} />
          </span>
          <span className="brand-name">TaskTrack</span>
        </div>
        <h1>Know what to do next, every day.</h1>
        <ul className="auth-points">
          {POINTS.map(({ icon: Icon, text }) => (
            <li key={text}>
              <span aria-hidden="true">
                <Icon size={17} />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </section>

      <main className="auth-main">
        <form className="auth-card" onSubmit={submit} noValidate>
          <h2>{registering ? 'Create your account' : 'Log in'}</h2>
          <p className="auth-sub">{registering ? 'It takes less than a minute.' : 'Welcome back. Your tasks are waiting.'}</p>

          {registering && (
            <label className="field">
              <span>Name</span>
              <div className="input-icon">
                <UserIcon size={16} aria-hidden="true" />
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} autoFocus />
              </div>
            </label>
          )}

          <label className="field">
            <span>Email</span>
            <div className="input-icon">
              <Mail size={16} aria-hidden="true" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus={!registering}
              />
            </div>
          </label>

          <label className="field">
            <span>Password</span>
            <div className="input-icon">
              <Lock size={16} aria-hidden="true" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={registering ? 'new-password' : 'current-password'}
                maxLength={72}
              />
              <button
                type="button"
                className="show-password"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
            {registering && <small>Use at least 8 characters.</small>}
          </label>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="button button-primary auth-submit" disabled={busy}>
            {busy ? 'Please wait' : registering ? 'Create account' : 'Log in'}
            {!busy && <ArrowRight size={16} aria-hidden="true" />}
          </button>

          <p className="auth-switch">
            {registering ? 'Already have an account?' : 'New to TaskTrack?'}{' '}
            <button type="button" onClick={() => switchMode(registering ? 'login' : 'register')}>
              {registering ? 'Log in' : 'Create an account'}
            </button>
          </p>
        </form>
      </main>
    </div>
  );
}
