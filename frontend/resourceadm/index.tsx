import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { RESOURCEADM_BASENAME } from 'app-shared/constants';
import { AppShell } from 'app-shared/AppShell';
import { App } from './app/App';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <AppShell>
    <BrowserRouter basename={RESOURCEADM_BASENAME}>
      <App />
    </BrowserRouter>
  </AppShell>,
);
