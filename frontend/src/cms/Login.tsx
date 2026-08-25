/**
 * The sign-in screen.
 *
 * Deliberately the only thing on the page: no nav, no links back into the CMS,
 * nothing that hints at what is behind it. The server answers a wrong username
 * and a wrong password identically, and so does this — the error text is
 * whatever the server said.
 */

import { useState, type FormEvent } from 'react';
import { signIn } from './session';
import { Button, ErrorNote } from './ui';
import { cms, mono } from './tokens';

export function Login({ onSignedIn }: { onSignedIn?: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(username.trim(), password);
      onSignedIn?.();
    } catch (err) {
      setError((err as Error).message);
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '6vh 20px',
        background: cms.bg,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: '100%',
          maxWidth: 380,
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
          padding: 34,
          border: `1px solid ${cms.border}`,
          borderRadius: 8,
          background: cms.surface,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ ...mono, color: cms.muted, fontSize: 10 }}>Portfolio CMS</span>
          <h1
            style={{
              margin: 0,
              fontFamily: "'Clash Display', sans-serif",
              fontWeight: 600,
              fontSize: 26,
              letterSpacing: '-0.02em',
            }}
          >
            Sign in
          </h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            className="cms-input"
            name="username"
            autoComplete="username"
            placeholder="Username or email"
            value={username}
            autoFocus
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="cms-input"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}

        <Button
          type="submit"
          variant="primary"
          busy={busy}
          disabled={!username || !password}
          style={{ justifyContent: 'center' }}
        >
          Sign in
        </Button>

        <a
          href="/"
          style={{ ...mono, color: cms.muted, fontSize: 10, textAlign: 'center' }}
        >
          ← Back to the site
        </a>
      </form>
    </div>
  );
}
