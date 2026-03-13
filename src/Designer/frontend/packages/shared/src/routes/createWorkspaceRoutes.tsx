import React, { type ReactElement, type ReactNode } from 'react';
import { Route } from 'react-router-dom';
import { NotFoundRouteErrorBoundary, RouteErrorBoundary } from './RouteErrorBoundary';
import { NotFoundPage } from './NotFoundPage';

type RouteDefinition = {
  path?: string;
  index?: boolean;
  element: ReactElement;
  errorElement?: ReactElement;
};

type WorkspaceRoutesOptions = {
  appElement?: ReactElement;
  layoutElement: ReactElement;
  basePath?: string;
  routeDefinitions: RouteDefinition[];
  notFoundElement?: ReactElement;
  additionalRootRoutes?: ReactNode;
  routeErrorElement?: ReactElement;
  notFoundRouteErrorElement?: ReactElement;
};

const renderRoute = (route: RouteDefinition, defaultErrorElement: ReactElement, index: number) => (
  <Route
    key={`${route.index ? 'index' : (route.path ?? '')}-${index}`}
    index={route.index}
    path={route.path}
    element={route.element}
    errorElement={route.errorElement ?? defaultErrorElement}
  />
);

export const createWorkspaceRoutes = ({
  appElement,
  layoutElement,
  basePath,
  routeDefinitions,
  notFoundElement = <NotFoundPage />,
  routeErrorElement = <RouteErrorBoundary />,
  notFoundRouteErrorElement = <NotFoundRouteErrorBoundary />,
}: WorkspaceRoutesOptions): ReactElement => {
  const routeChildren = (
    <>
      {routeDefinitions.map((route, index) => renderRoute(route, routeErrorElement, index))}
      <Route path='*' element={notFoundElement} errorElement={notFoundRouteErrorElement} />
    </>
  );

  const layoutRoute = (
    <Route path={basePath} element={layoutElement} errorElement={routeErrorElement}>
      {routeChildren}
    </Route>
  );

  if (!appElement) {
    return layoutRoute;
  }

  return <Route element={appElement}>{layoutRoute}</Route>;
};

export type { RouteDefinition, WorkspaceRoutesOptions };
