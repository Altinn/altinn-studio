﻿import type { Environment } from './StudioEnvironment';
import { StudioEnvironment } from './StudioEnvironment';

type SupportedRoutes =
  | 'altinnLoginPage'
  | 'dashboard'
  | 'dashboardCreateApp'
  | 'deploy'
  | 'editorOverview'
  | 'editorDatamodel'
  | 'editorProcess'
  | 'editorText'
  | 'editorUi'
  | 'gitea'
  | 'preview';

type RouterRoutes = Record<SupportedRoutes, string>;

const routerRoutes: RouterRoutes = {
  altinnLoginPage: '/',
  dashboard: '/dashboard',
  dashboardCreateApp: '/dashboard/self/new',
  deploy: '/editor/{{org}}/{{app}}/deploy',
  editorOverview: `/editor/{{org}}/{{app}}/overview`,
  editorDatamodel: `/editor/{{org}}/{{app}}/datamodel`,
  editorProcess: `/editor/{{org}}/{{app}}/process-editor`,
  editorText: `/editor/{{org}}/{{app}}/text-editor`,
  editorUi: `/editor/{{org}}/{{app}}/ui-editor`,
  gitea: `/repos/{{org}}/{{app}}`,
  preview: `/preview/{{org}}/{{app}}`,
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
