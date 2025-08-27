type SupportedRoute = 'altinnLoginPage' | 'dashboard' | 'resourceDashboard' | 'resourcePage';

type RouterRoutes = Record<SupportedRoute, string>;

export const Routes: RouterRoutes = {
  altinnLoginPage: '/',
  dashboard: '/dashboard/app-dashboard/self',
  resourceDashboard: '/resourceadm/{{org}}/{{repo}}',
  resourcePage: '/resourceadm/{{org}}/{{repo}}/resource/{{resourceId}}/about',
};

export const url = (route: string, routeArgs: Record<string, string> = {}): string => {
  return Object.keys(routeArgs).reduce(
    (acc, key) => acc.replaceAll(`{{${key}}}`, routeArgs[key]),
    route,
  );
};
