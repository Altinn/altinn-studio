import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import axios from 'axios';
import { AltinnGlobalData } from 'nextsrc/utils/AltinnGlobalData';
import { ApiRoutes } from 'nextsrc/utils/ApiRoutes';

// import { getCreateInstancesUrl } from 'src/utils/urls/appUrlHelper';

// 1. Enkel router for første side
// 2. App Shell
// 3. Instansierings modul

///  (await httpPost<IInstance>(getCreateInstancesUrl(partyId, language))).data)

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('root');
  const root = container && createRoot(container);

  root?.render(
    <RouterProvider
      router={createBrowserRouter(
        [
          {
            loader: async () => {
              console.log('load');
              // Hva skjal vi gjøre?
              // Instansiere?
              if (
                AltinnGlobalData.applicationMetaData.onEntry.show === 'new-instance' &&
                AltinnGlobalData.userProfile
              ) {
                const res = await axios.post(ApiRoutes.createInstanceUrl(AltinnGlobalData.userProfile.partyId, 'nb'));
                const data = res.data;
                console.log(JSON.stringify(data, null, 2));
              }

              // Skal vi til instance selection?
              // skal vi til party selection?

              return true;
            },

            path: '/',
            element: (
              <div>
                <pre>{JSON.stringify(AltinnGlobalData.applicationMetaData, null, 2)}</pre>
              </div>
            ),
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
