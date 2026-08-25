/**
 * Replacing a picture without leaving the page.
 *
 * Mounted inside whatever frame already holds the image — the project shot, the
 * portrait circle — where it covers that frame and nothing else. In edit mode
 * you get a button and a drop target over the real image at its real size,
 * which is the only way to judge a crop; the rest of the time it renders
 * nothing at all.
 *
 * The upload and the save are one gesture: the file goes up, the returned URL
 * goes straight into the column, and the page repaints from the same binding
 * inline text edits use.
 */

import { useRef, useState } from 'react';
import { api } from '../cms/api';
import { message } from '../cms/tokens';
import type { Binding } from './bindings';
import { useEditMode } from './mode';

type State = 'idle' | 'working' | 'error';

export function ImageDrop({ bind }: { bind: Binding }) {
  const editing = useEditMode();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  if (!editing || !bind.editable) return null;

  const send = async (file: File | undefined) => {
    if (!file) return;
    setState('working');
    setError(null);
    try {
      const stored = await api.uploads.upload(file);
      await bind.save(stored.url);
      setState('idle');
    } catch (err) {
      setError(message(err));
      setState('error');
      window.setTimeout(() => setState('idle'), 4000);
    } finally {
      if (input.current) input.current.value = '';
    }
  };

  // The project card is a link; a click meant for the file dialog must not
  // also follow it.
  const swallow = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      onDragOver={(event) => {
        swallow(event);
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event: React.DragEvent) => {
        swallow(event);
        setDragging(false);
        void send(event.dataTransfer.files?.[0]);
      }}
      onClick={swallow}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'inherit',
        border: `1px ${dragging ? 'solid' : 'dashed'} ${
          state === 'error' ? '#FF6B6B' : dragging ? '#45D9EF' : 'rgba(123,104,250,0.6)'
        }`,
        background: dragging ? 'rgba(69,217,239,0.14)' : 'rgba(21,24,29,0.28)',
        opacity: dragging || state !== 'idle' ? 1 : 0.001,
        transition: 'opacity 0.15s, background 0.15s, border-color 0.15s',
        cursor: 'pointer',
      }}
      // Invisible until pointed at: the page is still a page, not a form.
      onMouseEnter={(event) => (event.currentTarget.style.opacity = '1')}
      onMouseLeave={(event) => {
        if (state === 'idle' && !dragging) event.currentTarget.style.opacity = '0.001';
      }}
    >
      <button
        type="button"
        onClick={(event) => {
          swallow(event);
          input.current?.click();
        }}
        disabled={state === 'working'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 14px',
          borderRadius: 3,
          border: '1px solid rgba(233,236,240,0.25)',
          background: 'rgba(21,24,29,0.9)',
          color: '#E9ECF0',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          cursor: state === 'working' ? 'wait' : 'pointer',
          maxWidth: '90%',
        }}
      >
        {state === 'working' && <span className="cms-spinner" aria-hidden="true" />}
        {state === 'working'
          ? 'Uploading'
          : error
            ? error
            : bind.value
              ? 'Replace image'
              : 'Add image'}
      </button>

      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
        hidden
        onChange={(event) => void send(event.target.files?.[0])}
      />
    </div>
  );
}
