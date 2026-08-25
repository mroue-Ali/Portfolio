/**
 * The CMS shell: sidebar, header, and whichever editor the URL asks for.
 *
 * Everything below `/admin` renders here, and nothing renders at all until
 * `restore()` has confirmed the stored token with the server — a flash of the
 * dashboard for someone whose session has expired is both a lie and a stack of
 * failed requests.
 */

import { useEffect } from 'react';
import './cms.css';
import { Login } from './Login';
import { AboutPage } from './pages/AboutPage';
import { AiPage } from './pages/AiPage';
import { AskPage } from './pages/AskPage';
import { ContactPage } from './pages/ContactPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExperiencePage } from './pages/ExperiencePage';
import { ProfilePage } from './pages/ProfilePage';
import { ProjectsPage } from './pages/ProjectsPage';
import { SectionsPage } from './pages/SectionsPage';
import { StackPage } from './pages/StackPage';
import { UsersPage } from './pages/UsersPage';
import { ADMIN_ROOT, useRoute } from './router';
import { restore, signOut, useSession } from './session';
import { Button, Spinner } from './ui';
import { cms, mono } from './tokens';

type Page = {
  /** Path segment under /admin. '' is the dashboard. */
  slug: string;
  label: string;
  render: () => React.ReactNode;
};

const PAGES: Page[] = [
  { slug: '', label: 'Overview', render: () => <DashboardPage /> },
  { slug: 'profile', label: 'Profile', render: () => <ProfilePage /> },
  { slug: 'sections', label: 'Sections & nav', render: () => <SectionsPage /> },
  { slug: 'about', label: 'About', render: () => <AboutPage /> },
  { slug: 'stack', label: 'Stack', render: () => <StackPage /> },
  { slug: 'projects', label: 'Projects', render: () => <ProjectsPage /> },
  { slug: 'experience', label: 'Experience', render: () => <ExperiencePage /> },
  { slug: 'contact', label: 'Contact', render: () => <ContactPage /> },
  { slug: 'ask', label: 'Ask bar', render: () => <AskPage /> },
  { slug: 'ai', label: 'AI', render: () => <AiPage /> },
  { slug: 'account', label: 'Account', render: () => <UsersPage /> },
];

const href = (slug: string) => (slug ? `${ADMIN_ROOT}/${slug}` : ADMIN_ROOT);

function Sidebar({ page, navigate }: { page: string; navigate: (to: string) => void }) {
  const { user } = useSession();

  return (
    <aside
      style={{
        position: 'sticky',
        top: 0,
        alignSelf: 'start',
        height: '100vh',
        width: 232,
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '26px 14px',
        borderRight: `1px solid ${cms.border}`,
        background: cms.bg,
        overflowY: 'auto',
      }}
    >
      <div style={{ padding: '0 12px 22px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span
          style={{
            fontFamily: "'Clash Display', sans-serif",
            fontWeight: 600,
            fontSize: 17,
            letterSpacing: '-0.01em',
          }}
        >
          Portfolio CMS
        </span>
        <span style={{ ...mono, color: cms.muted, fontSize: 9.5 }}>
          {user?.username} · {user?.role}
        </span>
      </div>

      {PAGES.map((item) => (
        <button
          key={item.slug}
          className="cms-navlink"
          data-active={page === item.slug}
          onClick={() => navigate(href(item.slug))}
        >
          {item.label}
        </button>
      ))}

      <div
        style={{
          marginTop: 'auto',
          paddingTop: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <a
          href="/?edit=1"
          target="_blank"
          rel="noreferrer"
          className="cms-navlink"
          style={{ textDecoration: 'none' }}
        >
          Open the site ↗
        </a>
        <Button variant="ghost" onClick={signOut} style={{ justifyContent: 'flex-start' }}>
          Sign out
        </Button>
      </div>
    </aside>
  );
}

export default function CmsApp() {
  const { page, navigate } = useRoute();
  const session = useSession();

  useEffect(() => {
    void restore();
  }, []);

  useEffect(() => {
    document.title = 'Portfolio CMS';
  }, []);

  if (session.status === 'unknown') {
    return (
      <div className="cms" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <Spinner label="Checking your session" />
      </div>
    );
  }

  if (session.status === 'signed-out') {
    return (
      <div className="cms">
        <Login />
      </div>
    );
  }

  const current = PAGES.find((item) => item.slug === page) ?? PAGES[0];

  return (
    <div className="cms" style={{ display: 'flex', alignItems: 'flex-start' }}>
      <Sidebar page={current.slug} navigate={navigate} />
      <main style={{ flex: 1, minWidth: 0, padding: '38px 40px 90px' }}>
        <div style={{ maxWidth: 940, margin: '0 auto' }}>{current.render()}</div>
      </main>
    </div>
  );
}
