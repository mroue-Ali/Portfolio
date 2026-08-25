/**
 * Which editors the panel offers, as data.
 *
 * Its own module so `EditPanel` can render the picker without importing
 * `PanelBody` — which imports the whole CMS. A single static import of that
 * file from the portfolio's tree would put every editor into the bundle a
 * visitor downloads, lazy import or not.
 */

export type PanelSection =
  | 'profile'
  | 'sections'
  | 'about'
  | 'stack'
  | 'projects'
  | 'experience'
  | 'contact'
  | 'ask';

export const PANEL_SECTIONS: { key: PanelSection; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'sections', label: 'Sections & nav' },
  { key: 'about', label: 'About' },
  { key: 'stack', label: 'Stack' },
  { key: 'projects', label: 'Projects' },
  { key: 'experience', label: 'Experience' },
  { key: 'contact', label: 'Contact' },
  { key: 'ask', label: 'Ask bar' },
];

/** Section ids on the page, in document order, mapped to a panel section. */
const ANCHORS: { id: string; section: PanelSection }[] = [
  { id: 'about', section: 'about' },
  { id: 'stack', section: 'stack' },
  { id: 'projects', section: 'projects' },
  { id: 'experience', section: 'experience' },
  { id: 'contact', section: 'contact' },
];

/**
 * Whatever is crossing the middle of the viewport; the hero means profile.
 *
 * The panel opens on this, because the section you are looking at is nearly
 * always the one you meant to edit.
 */
export function sectionInView(): PanelSection {
  const middle = window.scrollY + window.innerHeight / 2;
  let found: PanelSection = 'profile';
  for (const anchor of ANCHORS) {
    const el = document.getElementById(anchor.id);
    if (el && el.offsetTop <= middle) found = anchor.section;
  }
  return found;
}
