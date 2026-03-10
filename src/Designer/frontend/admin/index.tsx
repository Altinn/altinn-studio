import React from 'react';
import { createRoot } from 'react-dom/client';
import { ADMIN_BASENAME } from 'app-shared/constants';
import { AppShell } from 'app-shared/AppShell';
import { routes } from './routes/routes';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);

root.render(<AppShell basename={ADMIN_BASENAME} routes={routes} />);
