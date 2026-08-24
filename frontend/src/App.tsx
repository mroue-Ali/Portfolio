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
import { color } from './theme';

export default function App() {
  // Mounted here so every section exists before ScrollTrigger measures them.
  useSiteAnimations();

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
    </div>
  );
}
