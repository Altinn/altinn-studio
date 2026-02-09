import React from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { GlobalData } from 'nextsrc/core/globalData';
import { entryRedirectLoader } from 'nextsrc/features/instantiate/loaders/entryRedirectLoader';
import { ErrorPage } from 'nextsrc/features/instantiate/pages/error/ErrorPage';
import { InstancePage } from 'nextsrc/features/instantiate/pages/instance/InstancePage';
import { InstanceSelectionPage } from 'nextsrc/features/instantiate/pages/instance-selection/InstanceSelectionPage';
import { PartySelectionPage } from 'nextsrc/features/instantiate/pages/party-selection/PartySelectionPage';
import { StatelessPage } from 'nextsrc/features/instantiate/pages/stateless/StatelessPage';
import { InstantiateRoutes } from 'nextsrc/features/instantiate/routes';

export const router = createBrowserRouter(
  [
    { path: InstantiateRoutes.root, loader: entryRedirectLoader, errorElement: <ErrorPage /> },
    { path: InstantiateRoutes.instance, element: <InstancePage /> },
    { path: InstantiateRoutes.instanceSelection, element: <InstanceSelectionPage /> },
    { path: InstantiateRoutes.partySelection, element: <PartySelectionPage /> },
    { path: InstantiateRoutes.stateless, element: <StatelessPage /> },
  ],
  { basename: GlobalData.basename },
);
