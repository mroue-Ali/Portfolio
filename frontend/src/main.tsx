import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { isAdminPath } from './cms/router';
import { loadContent } from './content';
import { applyTheme } from './theme';
import './styles/global.css';

const root = () => createRoot(document.getElementById('root')!);

/**
 * Two apps, one bundle entry.
 *
 * `/admin` is the CMS and `/` is the portfolio; they share nothing but the
 * origin, so the CMS is imported dynamically and never lands in the bundle a
 * visitor downloads.
 */
if (isAdminPath()) {
  void import('./cms/App').then(({ default: CmsApp }) => {
    root().render(
      <StrictMode>
        <CmsApp />
      </StrictMode>,
    );
  });
} else {
  /**
   * Content is fetched before the first render, not during it.
   *
   * The alternative — render, then swap the copy in — would remount every
   * section under GSAP after ScrollTrigger had already measured it.
   * `loadContent()` never rejects and gives up after a few seconds, so the worst
   * case is the bundled copy rendering a moment late rather than a page that
   * never arrives.
   */
  void loadContent().then((source) => {
    if (source === 'fallback' && import.meta.env.DEV) {
      console.warn('[content] API unreachable — rendering the bundled copy.');
    }

    // Before the first render, for the same reason the copy is: components read
    // `color` while rendering, and the stylesheet reads the custom properties
    // this writes. Doing it after would repaint the whole site in two passes.
    applyTheme();

    root().render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
}
