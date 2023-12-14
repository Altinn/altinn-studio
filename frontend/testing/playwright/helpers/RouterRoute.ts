import { Environment, StudioEnvironment } from './StudioEnvironment';

type SupportedRoutes = 'altinnLoginPage' | 'dashboard' | 'dashboardCreateApp' | 'editorOverview';

type RouterRoutes = Record<SupportedRoutes, string>;

export class RouterRoute extends StudioEnvironment {
  private readonly routerRoutes: RouterRoutes = {
    altinnLoginPage: '/',
    dashboard: '/dashboard',
    dashboardCreateApp: '/dashboard/self/new',
    editorOverview: `/editor/{{org}}/{{app}}/overview`,
  };

  constructor(environment: Environment) {
    super(environment);
  }

  public getRoute(route: SupportedRoutes): string {
    const routerRoute: string = this.routerRoutes[route];

    if (this.includesOrgAndApp(routerRoute)) {
      return this.replaceOrgAndMap(routerRoute);
    }

    return this.routerRoutes[route];
  }

  private replaceOrgAndMap(route: string): string {
    return route.replace('{{org}}', this.org).replace('{{app}}', this.app);
  }

  private includesOrgAndApp(route: string): boolean {
    return route.includes('{{org}}') || route.includes('{{app}}');
  }
}
