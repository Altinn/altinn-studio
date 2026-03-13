import React from 'react';
import { createRoot } from 'react-dom/client';
import { RESOURCEADM_BASENAME } from 'app-shared/constants';
import { AppShell } from 'app-shared/AppShell';
import { routes } from './routes/routes';
import resourceadm_nb from './language/src/nb.json';
import resourceadm_en from './language/src/en.json';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <AppShell
    basename={RESOURCEADM_BASENAME}
    routes={routes}
    extraTranslations={{ nb: resourceadm_nb, en: resourceadm_en }}
  />,
);
