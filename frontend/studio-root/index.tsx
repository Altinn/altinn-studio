import React from 'react';
import { createRoot } from 'react-dom/client';
import { STUDIO_ROOT_BASENAME } from 'app-shared/constants';
import { AppShell } from 'app-shared/AppShell';
import { routes } from './routes/routes';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(<AppShell basename={STUDIO_ROOT_BASENAME} routes={routes}></AppShell>);
