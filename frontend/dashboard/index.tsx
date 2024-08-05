import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from 'app-shared/AppShell';
import { routes } from './routes/routes';
import { DASHBOARD_BASENAME } from 'app-shared/constants';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(<AppShell basename={DASHBOARD_BASENAME} routes={routes} />);
