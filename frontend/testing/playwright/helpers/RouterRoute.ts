import type { Environment } from './StudioEnvironment';
import { StudioEnvironment } from './StudioEnvironment';

type SupportedRoutes =
  | 'altinnLoginPage'
  | 'dashboard'
  | 'dashboardCreateApp'
  | 'editorOverview'
  | 'editorDatamodel';

type RouterRoutes = Record<SupportedRoutes, string>;

const routerRoutes: RouterRoutes = {
  altinnLoginPage: '/',
  dashboard: '/dashboard',
  dashboardCreateApp: '/dashboard/self/new',
  editorOverview: `/editor/{{org}}/{{app}}/overview`,
  editorDatamodel: `/editor/{{org}}/{{app}}/datamodel`,
};

export class RouterRoute extends StudioEnvironment {
  constructor(environment: Environment) {
    super(environment);
  }

  public getRoute(route: SupportedRoutes): string {
    const routerRoute: string = routerRoutes[route];

    if (this.includesOrgAndApp(routerRoute)) {
      return this.replaceOrgAndMap(routerRoute);
    }

    return routerRoute;
  }

  public getGiteaRoute(appName: string): string {
    return `/repos/${this.org}/${appName}`;
  }

  private replaceOrgAndMap(route: string): string {
    return route.replace('{{org}}', this.org).replace('{{app}}', this.app);
  }

  private includesOrgAndApp(route: string): boolean {
    return route.includes('{{org}}') || route.includes('{{app}}');
  }
}
