import type { NonIndexRouteObject } from 'react-router';

/**
 * The part of React Router's Route Module API we use. A route module exports its component as the
 * default export and its data functions as `clientLoader`/`clientAction`.
 *
 * @see https://reactrouter.com/start/framework/route-module
 */
type RouteModule = {
  default: NonIndexRouteObject['Component'];
  clientLoader?: NonIndexRouteObject['loader'];
  clientAction?: NonIndexRouteObject['action'];
} & Pick<NonIndexRouteObject, 'ErrorBoundary' | 'HydrateFallback' | 'shouldRevalidate' | 'handle'>;

/** Everything a route module contributes. `path`, `index` and `children` stay in the router config. */
type ConvertedRouteModule = Omit<NonIndexRouteObject, 'path' | 'index' | 'children'>;

/**
 * Maps a route module onto the route object shape `createBrowserRouter` expects. React Router's Vite
 * plugin reads the route module exports directly, so this conversion goes away if we decide to adopt it sometime in the future.
 * Most notably it converts the `default` export to `Component`, and `clientLoader`/`clientAction` to `loader`/`action`.
 *
 * @see https://reactrouter.com/upgrading/router-provider
 */
export function convertRouteModule(routeModule: RouteModule): ConvertedRouteModule {
  return {
    Component: routeModule.default,
    loader: routeModule.clientLoader,
    action: routeModule.clientAction,
    ErrorBoundary: routeModule.ErrorBoundary,
    HydrateFallback: routeModule.HydrateFallback,
    shouldRevalidate: routeModule.shouldRevalidate,
    handle: routeModule.handle,
  };
}
