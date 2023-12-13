type SupportedRoutes = 'altinnLoginPage' | 'dashboard' | 'dashboardCreateApp' | 'editorOverview';

type RouterRoutes = Record<SupportedRoutes, string>;

export class Routes {
  private readonly _org: string = '';
  private readonly _app: string = '';

  private readonly routerRoutes: RouterRoutes = {
    altinnLoginPage: '/',
    dashboard: '/dashboard',
    dashboardCreateApp: '/dashboard/self/new',
    editorOverview: `/editor/{{org}}/{{app}}/overview`,
  };

  constructor(org?: string, app?: string) {
    this._org = org;
    this._app = app;
  }

  public getRoute(route: SupportedRoutes): string {
    const routerRoute = this.routerRoutes[route];

    if (this.includesOrgAndApp(routerRoute)) {
      return this.replaceOrgAndMap(routerRoute);
    }

    return this.routerRoutes[route];
  }

  private replaceOrgAndMap(route: string): string {
    return route.replace('{{org}}', this._org).replace('{{app}}', this._app);
  }

  private includesOrgAndApp(route: string): boolean {
    return route.includes('{{org}}') || route.includes('{{app}}');
  }
}
