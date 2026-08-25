/**
 * The CMS editors, rendered inside the slide-over on the portfolio.
 *
 * Exactly the same components as /admin — not a second, lesser editor. Inline
 * editing covers changing words that are already on the page; this covers
 * everything that has no text to click: adding a project, reordering the
 * timeline, unpublishing an answer, swapping a screenshot.
 *
 * Imported lazily by `EditPanel`, so opening the panel is what pulls the CMS
 * into the page — never a page load.
 */

import '../cms/cms.css';
import type { PanelSection } from './sections';
import { AboutPage } from '../cms/pages/AboutPage';
import { AskPage } from '../cms/pages/AskPage';
import { ContactPage } from '../cms/pages/ContactPage';
import { ExperiencePage } from '../cms/pages/ExperiencePage';
import { ProfilePage } from '../cms/pages/ProfilePage';
import { ProjectsPage } from '../cms/pages/ProjectsPage';
import { SectionsPage } from '../cms/pages/SectionsPage';
import { StackPage } from '../cms/pages/StackPage';

const PAGES: Record<PanelSection, () => React.ReactNode> = {
  profile: () => <ProfilePage />,
  sections: () => <SectionsPage />,
  about: () => <AboutPage />,
  stack: () => <StackPage />,
  projects: () => <ProjectsPage />,
  experience: () => <ExperiencePage />,
  contact: () => <ContactPage />,
  ask: () => <AskPage />,
};

export default function PanelBody({ section }: { section: PanelSection }) {
  return <div className="cms">{PAGES[section]()}</div>;
}
