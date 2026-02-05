import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { AltinnGlobalData } from 'nextsrc/utils/AltinnGlobalData';

// 1. Enkel router for første side
// 2. App Shell
// 3. Instansierings modul

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('root');
  const root = container && createRoot(container);
  root?.render(
    <RouterProvider
      router={createBrowserRouter(
        [
          {
            path: '*',
            element: <div>root</div>,
          },
        ],
        {
          future: {
            v7_relativeSplatPath: true,
          },
          basename: `/${AltinnGlobalData.org}/${AltinnGlobalData.app}`,
        },
      )}
      future={{ v7_startTransition: true }}
    />,
  );
});
