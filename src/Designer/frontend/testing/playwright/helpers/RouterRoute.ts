import type { Environment } from './StudioEnvironment';
import { StudioEnvironment } from './StudioEnvironment';

type SupportedRoutes =
  | 'altinnLoginPage'
  | 'dashboard'
  | 'dashboardCreateApp'
  | 'dashboardAsOrg'
  | 'orgLibrary'
  | 'deploy'
  | 'editorOverview'
  | 'editorDataModel'
  | 'editorProcess'
  | 'editorText'
  | 'editorUi'
  | 'gitea'
  | 'preview'
  | 'appSettings';

type RouterRoutes = Record<SupportedRoutes, string>;

const routerRoutes: RouterRoutes = {
  altinnLoginPage: '/',
  dashboard: '/dashboard/app-dashboard/self',
  dashboardCreateApp: '/dashboard/app-dashboard/self/new',
  dashboardAsOrg: '/dashboard/app-dashboard/{{org}}',
  orgLibrary: '/dashboard/org-library/{{org}}',
  deploy: '/editor/{{org}}/{{app}}/deploy',
  editorOverview: '/editor/{{org}}/{{app}}/overview',
  editorDataModel: '/editor/{{org}}/{{app}}/data-model',
  editorProcess: '/editor/{{org}}/{{app}}/process-editor',
  editorText: '/editor/{{org}}/{{app}}/text-editor',
  editorUi: '/editor/{{org}}/{{app}}/ui-editor',
  gitea: '/repos/{{org}}/{{app}}',
  preview: '/preview/{{org}}/{{app}}',
  appSettings: '/editor/{{org}}/{{app}}/app-settings',
};

export class RouterRoute extends StudioEnvironment {
  constructor(environment: Environment) {
    super(environment);
  }

  public getRoute(route: SupportedRoutes, useTtdAsOrg: boolean = false): string {
    const routerRoute: string = routerRoutes[route];

    if (this.includesOrgAndApp(routerRoute)) {
      return this.replaceOrgAndMap(routerRoute, useTtdAsOrg);
    }

    return routerRoute;
  }

  private replaceOrgAndMap(route: string, useTtdAsOrg: boolean = false): string {
    return route.replace('{{org}}', useTtdAsOrg ? 'ttd' : this.org).replace('{{app}}', this.app);
  }

  private includesOrgAndApp(route: string): boolean {
    return route.includes('{{org}}') || route.includes('{{app}}');
  }
}
