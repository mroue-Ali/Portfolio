/**
 * Choosing an image, three ways.
 *
 * Drop a file on it, pick one from the file dialog, or take one already
 * uploaded from the library. What the field stores either way is the URL the
 * server hands back, and that URL is still visible and editable underneath —
 * the images that shipped with the repo live in `public/` rather than the
 * upload directory, and typing a path has to keep working for them.
 *
 * The preview is the point. A path in a text box tells you nothing about
 * whether it is the right screenshot.
 */

import { useRef, useState } from 'react';
import { api, type UploadRow } from './api';
import { assetUrl } from '../content';
import { cms, message, mono } from './tokens';
import { Button, DeleteButton, ErrorNote, IconButton } from './ui';
import { Cross } from './fields';

const kb = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

/** Keyed by `src` where it is used: a new path deserves a fresh attempt at
 *  loading, and remounting is how that state resets. */
function Preview({ src, alt }: { src: string; alt: string }) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <span style={{ ...mono, color: cms.muted, fontSize: 9.5, textAlign: 'center', padding: 6 }}>
        {src ? 'not found' : 'no image'}
      </span>
    );
  }
  return (
    <img
      src={assetUrl(src)}
      alt={alt}
      onError={() => setBroken(true)}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  );
}

export function ImageField({
  value,
  onChange,
  hint,
}: {
  value: string;
  onChange: (next: string) => void;
  hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [library, setLibrary] = useState<UploadRow[] | null>(null);

  const send = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const stored = await api.uploads.upload(file);
      onChange(stored.url);
      // The library, if it is open, is now one behind.
      setLibrary((prev) => (prev ? [stored, ...prev] : prev));
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const toggleLibrary = async () => {
    if (library) {
      setLibrary(null);
      return;
    }
    setError(null);
    try {
      setLibrary(await api.uploads.list());
    } catch (err) {
      setError(message(err));
    }
  };

  const removeFromLibrary = async (row: UploadRow) => {
    try {
      await api.uploads.remove(row.filename);
      setLibrary((prev) => prev?.filter((f) => f.filename !== row.filename) ?? null);
      // Rows elsewhere may still point at it; only clear the one being edited.
      if (value === row.url) onChange('');
    } catch (err) {
      setError(message(err));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void send(e.dataTransfer.files?.[0]);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: 12,
          border: `1px ${dragging ? 'solid' : 'dashed'} ${dragging ? cms.violet : cms.border}`,
          borderRadius: 5,
          background: dragging ? 'rgba(123,104,250,0.08)' : cms.bg,
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 108,
            height: 68,
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            overflow: 'hidden',
            border: `1px solid ${cms.border}`,
            background: 'linear-gradient(160deg,#22272E,#15181D)',
          }}
        >
          <Preview key={value} src={value} alt="" />
          {busy && (
            <span
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(21,24,29,0.72)',
              }}
            >
              <span className="cms-spinner" />
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="sm" busy={busy} onClick={() => input.current?.click()}>
              Upload
            </Button>
            <Button size="sm" variant="ghost" onClick={toggleLibrary}>
              {library ? 'Hide library' : 'Library'}
            </Button>
            {value && (
              <IconButton label="Clear" onClick={() => onChange('')}>
                <Cross />
              </IconButton>
            )}
          </div>

          <input
            className="cms-input"
            value={value}
            spellCheck={false}
            placeholder="/media/… or /projects/…"
            onChange={(e) => onChange(e.target.value)}
          />
        </div>

        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
          hidden
          onChange={(e) => void send(e.target.files?.[0])}
        />
      </div>

      {hint && <span style={{ color: cms.muted, fontSize: 12, lineHeight: 1.5 }}>{hint}</span>}
      {error && <ErrorNote>{error}</ErrorNote>}

      {library && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))',
            gap: 8,
            padding: 12,
            border: `1px solid ${cms.border}`,
            borderRadius: 5,
            background: cms.bg,
            maxHeight: 330,
            overflowY: 'auto',
          }}
        >
          {library.length === 0 && (
            <span style={{ color: cms.muted, fontSize: 13, gridColumn: '1 / -1' }}>
              Nothing uploaded yet.
            </span>
          )}
          {library.map((row) => {
            const chosen = row.url === value;
            return (
              <div key={row.filename} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <button
                  type="button"
                  onClick={() => onChange(row.url)}
                  title={`${row.filename} · ${kb(row.size)}`}
                  style={{
                    position: 'relative',
                    height: 74,
                    padding: 0,
                    borderRadius: 4,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: cms.surface,
                    border: `1px solid ${chosen ? cms.cyan : cms.border}`,
                    boxShadow: chosen ? `0 0 0 1px ${cms.cyan}` : 'none',
                  }}
                >
                  <img
                    src={assetUrl(row.url)}
                    alt={row.filename}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      color: cms.muted,
                      fontSize: 10,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.filename}
                  </span>
                  <DeleteButton onConfirm={() => removeFromLibrary(row)} label="×" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
