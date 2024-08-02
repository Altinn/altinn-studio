import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from 'app-shared/AppShell';
import { DASHBOARD_BASENAME } from 'app-shared/constants';
import { routes } from './routes/routes';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(<AppShell basename={DASHBOARD_BASENAME} routes={routes} />);
