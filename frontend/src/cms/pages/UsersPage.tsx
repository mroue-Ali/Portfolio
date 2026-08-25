/**
 * Accounts, and your own password.
 *
 * Not a `CollectionEditor`: users live under `/api/auth`, have no position, and
 * creating one needs a password field that must never come back from the server
 * or sit in a draft after it is saved. Close enough to reuse the field renderer,
 * far enough to be its own screen.
 */

import { useState } from 'react';
import { api, request, type UserRow } from '../api';
import { useResource } from '../useResource';
import { Fields, type FieldSpec } from '../fields';
import { useSession } from '../session';
import { Badge, Button, Card, DeleteButton, ErrorNote, PageHeader, Spinner } from '../ui';
import { cms, mono, type SaveState } from '../tokens';
import { useToast } from '../useToast';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrator — can manage accounts' },
  { value: 'editor', label: 'Editor — content only' },
] as const;

const NEW_USER: FieldSpec[] = [
  { name: 'username', label: 'Username', placeholder: 'ali' },
  { name: 'password', label: 'Password', type: 'password', hint: 'At least 8 characters.' },
  { name: 'name', label: 'Display name', placeholder: 'Ali Mroue' },
  { name: 'email', label: 'Email', placeholder: 'you@example.com' },
  { name: 'role', label: 'Role', type: 'select', options: ROLE_OPTIONS, span: 2 },
];

const message = (error: unknown) => (error as Error)?.message ?? 'Something went wrong';

function UserCard({
  user,
  isSelf,
  onChanged,
}: {
  user: UserRow;
  isSelf: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');

  const patch = async (payload: Parameters<typeof api.users.update>[1]) => {
    setBusy(true);
    setError(null);
    try {
      await api.users.update(user.id, payload);
      setPassword('');
      onChanged();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setError(null);
    try {
      await api.users.remove(user.id);
      onChanged();
    } catch (err) {
      setError(message(err));
    }
  };

  return (
    <Card style={{ padding: 18 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 15 }}>{user.username}</strong>
            <Badge tone={user.role === 'admin' ? 'warn' : 'neutral'}>{user.role}</Badge>
            {!user.is_active && <Badge tone="off">disabled</Badge>}
            {isSelf && <Badge tone="ok">you</Badge>}
          </div>
          <span style={{ color: cms.muted, fontSize: 12.5 }}>
            {[user.name, user.email].filter(Boolean).join(' · ') || 'No name or email set'}
            {' — '}
            {user.last_login_at
              ? `last signed in ${new Date(user.last_login_at).toLocaleString()}`
              : 'never signed in'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select
            className="cms-select"
            style={{ width: 'auto' }}
            value={user.role}
            disabled={busy}
            onChange={(e) => patch({ role: e.target.value as UserRow['role'] })}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value}
              </option>
            ))}
          </select>
          <Button size="sm" disabled={busy || isSelf} onClick={() => patch({ is_active: !user.is_active })}>
            {user.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          {!isSelf && <DeleteButton onConfirm={remove} />}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 10,
          marginTop: 16,
          paddingTop: 14,
          borderTop: `1px solid ${cms.border}`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ ...mono, color: cms.muted, fontSize: 10 }}>Set a new password</span>
          <input
            className="cms-input"
            type="password"
            autoComplete="new-password"
            value={password}
            placeholder="Leave empty to keep the current one"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          disabled={password.length < 8 || busy}
          onClick={() => patch({ password })}
        >
          Update
        </Button>
      </div>

      {error && (
        <div style={{ marginTop: 12 }}>
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </Card>
  );
}

function NewUser({ onCreated }: { onCreated: () => void }) {
  const blank = { username: '', password: '', name: '', email: '', role: 'editor' };
  const [draft, setDraft] = useState<Record<string, unknown>>(blank);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setState('saving');
    setError(null);
    try {
      await api.users.create(draft as Parameters<typeof api.users.create>[0]);
      setDraft(blank);
      setOpen(false);
      setState('idle');
      onCreated();
    } catch (err) {
      setError(message(err));
      setState('error');
    }
  };

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        + Add account
      </Button>
    );
  }

  return (
    <Card style={{ marginBottom: 18 }}>
      <Fields
        specs={NEW_USER}
        draft={draft}
        onChange={(name, value) => setDraft((prev) => ({ ...prev, [name]: value }))}
      />
      {error && (
        <div style={{ marginTop: 14 }}>
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          variant="primary"
          busy={state === 'saving'}
          disabled={String(draft.username).length < 2 || String(draft.password).length < 8}
          onClick={create}
        >
          Create account
        </Button>
      </div>
    </Card>
  );
}

function ChangeOwnPassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [state, setState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const submit = async () => {
    setState('saving');
    setError(null);
    try {
      await request<void>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      setCurrent('');
      setNext('');
      setState('idle');
      toast.show('Password changed.');
    } catch (err) {
      setError(message(err));
      setState('error');
    }
  };

  return (
    <Card>
      <h2 style={{ ...mono, margin: '0 0 16px', color: cms.muted, fontWeight: 500 }}>
        Your password
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 16 }}>
        <input
          className="cms-input"
          type="password"
          autoComplete="current-password"
          placeholder="Current password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <input
          className="cms-input"
          type="password"
          autoComplete="new-password"
          placeholder="New password (8+ characters)"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </div>
      {error && (
        <div style={{ marginTop: 14 }}>
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <Button
          onClick={submit}
          busy={state === 'saving'}
          disabled={!current || next.length < 8}
        >
          Change password
        </Button>
      </div>
      {toast.element}
    </Card>
  );
}

export function UsersPage() {
  const { user } = useSession();
  const { data, loading, error, reload } = useResource(() => api.users.list());
  const isAdmin = user?.role === 'admin';

  return (
    <>
      <PageHeader
        title="Account"
        description={
          isAdmin
            ? 'Who can sign into the CMS. Editors can change every piece of content; administrators can also manage accounts.'
            : 'Your sign-in details.'
        }
      />

      <div style={{ marginBottom: 30 }}>
        <ChangeOwnPassword />
      </div>

      {isAdmin && (
        <>
          <div style={{ marginBottom: 18 }}>
            <NewUser onCreated={reload} />
          </div>

          {loading && !data && <Spinner />}
          {error && <ErrorNote>{error}</ErrorNote>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data?.map((row) => (
              <UserCard
                key={row.id}
                user={row}
                isSelf={row.id === user?.id}
                onChanged={reload}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
