import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, redirect, RouterProvider } from 'react-router-dom';

import axios from 'axios';
import { AltinnGlobalData } from 'nextsrc/utils/AltinnGlobalData';
import { ApiRoutes } from 'nextsrc/utils/ApiRoutes';
import { AppRoutes } from 'nextsrc/utils/AppRoutes';

import type { IInstance } from 'src/types/shared';

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
              if (AltinnGlobalData.applicationMetaData.onEntry.show === 'select-instance') {
                return redirect(AppRoutes.selectInstanceUrl);
              }

              if (
                AltinnGlobalData.applicationMetaData.onEntry.show === 'new-instance' &&
                AltinnGlobalData.userProfile
              ) {
                // no party?
                // do I have lots of instances?
                const res = await axios.post<IInstance>(
                  ApiRoutes.createInstanceUrl(AltinnGlobalData.userProfile.partyId, 'nb'),
                );
                const data = res.data;
                const [instanceOwnerPartyId, instanceGuid] = data.id.split('/');
                return redirect(AppRoutes.instanceUrl(instanceOwnerPartyId, instanceGuid));
              }

              // Skal vi til instance selection?
              // skal vi til party selection?
              return true;
            },
            path: '/',
            errorElement: <div>WOOPSIES!!!</div>,
            element: (
              <div>
                <pre>{JSON.stringify(AltinnGlobalData.applicationMetaData, null, 2)}</pre>
              </div>
            ),
          },
          {
            path: '/instance/:partyId/:instanceGuid',
            element: <div>I am instnace</div>,
          },
          {
            path: '/party-selection',
            element: <div>I am party</div>,
          },
          {
            path: '/instance-selection',
            element: <div>I am instance selection</div>,
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
