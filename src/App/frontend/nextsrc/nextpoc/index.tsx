import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from 'nextsrc/nextpoc/app/App/App';

// import 'src/features/baseurlinjection';
// import 'src/features/toggles';
// import 'src/features/logging';
// import 'src/features/styleInjection';
// import '@digdir/designsystemet-css';
// import { App } from 'src/App';

// import 'react-toastify/dist/ReactToastify.css';
// import 'src/index.css';
// import '@digdir/designsystemet-theme/brand/altinn/tokens.css';

export function newEntry() {
  document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('root');
    const root = container && createRoot(container);
    root?.render(<App />);
  });
}
