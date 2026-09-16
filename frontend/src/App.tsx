import { About } from './components/About';
import { Backdrop } from './components/Backdrop';
import { Contact } from './components/Contact';
import { Cursor } from './components/Cursor';
import { Experience } from './components/Experience';
import { Hero } from './components/Hero';
import { Nav } from './components/Nav';
import { PointerField } from './components/PointerField';
import { ProgressBar } from './components/ProgressBar';
import { Projects } from './components/Projects';
import { Stack } from './components/Stack';
import { projects } from './content';
import { useSiteAnimations } from './hooks/useSiteAnimations';
import { EditLayer } from './live/EditLayer';
import { useContentVersion } from './live/store';
import { color } from './theme';

export default function App() {
  /**
   * Re-renders the page when its content is edited.
   *
   * One subscription at the root covers every section: the content modules are
   * mutated in place, so a render with the new version reads the new text
   * without anything remounting — GSAP keeps the elements and the measurements
   * it already made. For a visitor this never fires.
   */
  useContentVersion();

  // Mounted here so every section exists before ScrollTrigger measures them.
  // Read after the subscription above, so switching the projects layout in edit
  // mode rebuilds the triggers rather than leaving a pin over a list.
  useSiteAnimations(projects.layout);

  return (
    <div style={{ position: 'relative', width: '100%', background: color.bg }}>
      <Backdrop />
      <ProgressBar />
      <Cursor />
      <PointerField />
      <Nav />

      <Hero />
      <About />
      <Stack />
      <Projects />
      <Experience />
      <Contact />

      <EditLayer />
    </div>
  );
}
