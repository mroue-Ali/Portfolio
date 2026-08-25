/**
 * Everything edit mode adds to the portfolio, in one mount.
 *
 * `App` renders `<EditLayer />` unconditionally; the layer decides there is
 * nothing to show. For a visitor that decision costs one `/api/auth/me` call
 * only if a token is present in this browser — no token, no request, no chrome,
 * nothing in the DOM.
 *
 * Nothing here is imported by the sections themselves. Take this component out
 * and the site is exactly what it was before the CMS existed.
 */

import { useEffect, useState } from 'react';
import { signOut, useSession, restore } from '../cms/session';
import { EditPanel } from './EditPanel';
import { setEditMode, restoreEditMode, toggleEditMode, useEditMode } from './mode';
import { sectionInView, type PanelSection } from './sections';
import { contentSource } from '../content';
import './live.css';

const bar: React.CSSProperties = {
  position: 'fixed',
  left: 20,
  bottom: 20,
  zIndex: 130,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '9px 12px',
  border: '1px solid #2F353E',
  borderRadius: 999,
  background: 'rgba(30,34,40,0.9)',
  backdropFilter: 'blur(14px)',
  boxShadow: '0 14px 40px rgba(0,0,0,0.45)',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#E9ECF0',
};

const chip: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 11px',
  border: '1px solid transparent',
  borderRadius: 999,
  background: 'transparent',
  color: '#9AA2AD',
  font: 'inherit',
  letterSpacing: 'inherit',
  textTransform: 'inherit',
  cursor: 'pointer',
};

export function EditLayer() {
  const session = useSession();
  const editing = useEditMode();
  const [panel, setPanel] = useState<PanelSection | null>(null);

  useEffect(() => {
    void restore().then(restoreEditMode);
  }, []);

  if (session.status !== 'signed-in') return null;

  const offline = contentSource !== 'api';
  // Derived, not reset in an effect: leaving edit mode takes the panel with it.
  const openPanel = editing ? panel : null;

  return (
    <>
      <div className="live-bar" style={bar}>
        <button
          onClick={() => toggleEditMode()}
          title={
            offline
              ? 'The page is showing its bundled copy — the API is unreachable, so there is nothing to save to.'
              : 'Click any text on the page to change it'
          }
          disabled={offline}
          style={{
            ...chip,
            border: `1px solid ${editing ? 'transparent' : '#2F353E'}`,
            background: editing ? 'linear-gradient(135deg,#7B68FA,#45D9EF)' : 'transparent',
            color: editing ? '#10131A' : '#9AA2AD',
            fontWeight: editing ? 600 : 400,
            opacity: offline ? 0.5 : 1,
            cursor: offline ? 'not-allowed' : 'pointer',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: editing ? '#10131A' : '#45D9EF',
              boxShadow: editing ? 'none' : '0 0 8px rgba(69,217,239,0.8)',
            }}
          />
          {editing ? 'Editing' : 'Edit site'}
        </button>

        {editing && (
          <button
            style={chip}
            onClick={() => setPanel((open) => (open ? null : sectionInView()))}
          >
            {openPanel ? 'Hide panel' : 'Add & arrange'}
          </button>
        )}

        <span style={{ width: 1, height: 18, background: '#2F353E' }} />

        <a href="/admin" style={{ ...chip, textDecoration: 'none' }}>
          CMS
        </a>
        <button
          style={chip}
          title={`Signed in as ${session.user?.username}`}
          onClick={() => {
            setEditMode(false);
            signOut();
          }}
        >
          Sign out
        </button>
      </div>

      {openPanel && (
        <EditPanel section={openPanel} onSection={setPanel} onClose={() => setPanel(null)} />
      )}
    </>
  );
}
