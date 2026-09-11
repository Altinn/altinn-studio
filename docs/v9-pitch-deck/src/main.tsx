import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted Inter — no network fetch at present time.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';

import './styles/global.css';
import { App } from './App';
import { disableAcceleratedAnimations } from './deck';
import { harnessRoot } from './sims/harnessEntry'; // dev only: `?sim=innbygger`

// Must run before the first animation starts. Without it every framer-motion
// opacity animation in the deck ends on one frame of the value it started FROM:
// an old slide flashing back at full strength, a reveal blinking out just as it
// lands. See motionFlickerFix.ts for the upstream cause.
disableAcceleratedAnimations();

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    {harnessRoot() ?? <App />}
  </StrictMode>,
);
