// Route patterns (for router declaration)
import { generatePath } from 'react-router-dom';

export const routes = {
  root: '/',
  partySelection: '/party-selection',
  instance: '/instance/:instanceOwnerPartyId/:instanceGuid',
  task: '/instance/:instanceOwnerPartyId/:instanceGuid/:taskId',
  page: '/instance/:instanceOwnerPartyId/:instanceGuid/:taskId/:pageId',
  instanceSelection: '/instance-selection',
  stateless: '/:pageId',
} as const;

// URL builders (for navigation)
export const routeBuilders = buildRoutes(routes);

function routeBuilder<P extends string>(pattern: P) {
  return (params: Parameters<typeof generatePath<P>>[1]) => generatePath(pattern, params);
}

function buildRoutes<T extends Record<string, string>>(routes: T) {
  return Object.fromEntries(Object.entries(routes).map(([key, pattern]) => [key, routeBuilder(pattern)])) as {
    [K in keyof T]: ReturnType<typeof routeBuilder<T[K]>>;
  };
}
