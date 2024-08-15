import React from 'react';
import ReactDOM from 'react-dom/client';

import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { RouterRouteConfig } from '../configs/RouterRouteConfig';

export const libraryEntryPoint = (routerRouteConfig: RouterRouteConfig): void => {
  const router = createBrowserRouter([...routerRouteConfig.getAvailableRoutes()], {
    basename: routerRouteConfig.getRouterBasename(),
  });

  return ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  );
};
