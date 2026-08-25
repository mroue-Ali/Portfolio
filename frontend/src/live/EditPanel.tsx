/**
 * The slide-over that puts the CMS next to the page it edits.
 *
 * It opens on whichever section you are looking at, because that is nearly
 * always the one you meant. Scrolling the page behind it stays possible on
 * purpose: you scroll to a project, open the panel, and the panel is already
 * showing projects.
 */

import { Suspense, lazy, useEffect, useState } from 'react';
import { PANEL_SECTIONS, type PanelSection } from './sections';

const PanelBody = lazy(() => import('./PanelBody'));

export function EditPanel({
  section,
  onSection,
  onClose,
}: {
  section: PanelSection;
  onSection: (next: PanelSection) => void;
  onClose: () => void;
}) {
  const [width] = useState(() => Math.min(520, window.innerWidth - 24));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Escape closes — unless it is cancelling an inline edit inside the panel.
      const target = event.target as HTMLElement | null;
      const typing = target?.closest('input, textarea, select, [contenteditable]');
      if (event.key === 'Escape' && !typing) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <aside
      className="live-panel"
      aria-label="Content editor"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width,
        zIndex: 120,
        display: 'flex',
        flexDirection: 'column',
        background: '#15181D',
        borderLeft: '1px solid #2F353E',
        boxShadow: '-24px 0 60px rgba(0,0,0,0.5)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px',
          borderBottom: '1px solid #2F353E',
          flex: 'none',
        }}
      >
        <select
          className="cms-select"
          value={section}
          onChange={(e) => onSection(e.target.value as PanelSection)}
          style={{ width: 'auto', flex: 1, fontFamily: "'Satoshi', system-ui, sans-serif" }}
        >
          {PANEL_SECTIONS.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>

        <a
          href="/admin"
          target="_blank"
          rel="noreferrer"
          className="cms-btn"
          data-size="sm"
          data-variant="ghost"
          style={{ textDecoration: 'none' }}
        >
          Full CMS ↗
        </a>
        <button className="cms-btn" data-size="sm" data-variant="ghost" onClick={onClose}>
          Close
        </button>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 18px 60px' }}>
        <Suspense
          fallback={
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: '#9AA2AD' }}>
              <span className="cms-spinner" /> Loading editor…
            </div>
          }
        >
          <PanelBody section={section} />
        </Suspense>
      </div>
    </aside>
  );
}
