import { About } from './components/About';
import { Backdrop } from './components/Backdrop';
import { Contact } from './components/Contact';
import { Cursor } from './components/Cursor';
import { Experience } from './components/Experience';
import { Hero } from './components/Hero';
import { Nav } from './components/Nav';
import { ProgressBar } from './components/ProgressBar';
import { Projects } from './components/Projects';
import { Stack } from './components/Stack';
import { useSiteAnimations } from './hooks/useSiteAnimations';
import { EditLayer } from './live/EditLayer';
import { useContentVersion } from './live/store';
import { color } from './theme';

export default function App() {
  // Mounted here so every section exists before ScrollTrigger measures them.
  useSiteAnimations();

  /**
   * Re-renders the page when its content is edited.
   *
   * One subscription at the root covers every section: the content modules are
   * mutated in place, so a render with the new version reads the new text
   * without anything remounting — GSAP keeps the elements and the measurements
   * it already made. For a visitor this never fires.
   */
  useContentVersion();

  return (
    <div style={{ position: 'relative', width: '100%', background: color.bg }}>
      <Backdrop />
      <ProgressBar />
      <Cursor />
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
