type ParamsOptions = {
  org?: string;
  app?: string;
};

type PackagesRoute =
  | 'dashboard'
  | 'dataModel'
  | 'editorOverview'
  | 'editorUiEditor'
  | 'preview'
  | 'editorPublish'
  | 'latestCommit'
  | 'appSettings';

const packagesRoutes: Record<PackagesRoute, string> = {
  dashboard: '/dashboard',
  dataModel: '/editor/{{org}}/{{app}}/data-model',
  editorOverview: '/editor/{{org}}/{{app}}/overview',
  editorUiEditor: '/editor/{{org}}/{{app}}/ui-editor',
  editorPublish: '/editor/{{org}}/{{app}}/deploy',
  latestCommit: '/editor/{{org}}/{{app}}/latest-commit',
  preview: '/preview/{{org}}/{{app}}',
  appSettings: '/editor/{{org}}/{{app}}/app-settings',
};

export class PackagesRouter {
  private app: string;
  private org: string;

  constructor(private paramsOptions?: ParamsOptions) {
    this.app = this.paramsOptions?.app ?? '';
    this.org = this.paramsOptions?.org ?? '';
  }

  public navigateToPackage(packageRoute: PackagesRoute, queryParams?: string): void {
    window.location.assign(`${this.getPackageNavigationUrl(packageRoute)}${queryParams ?? ''}`);
  }

  public getPackageNavigationUrl(packageRoute: PackagesRoute, queryParams?: string): string {
    const selectedPackageRoute = packagesRoutes[packageRoute];

    if (selectedPackageRoute.includes('{{org}}') || selectedPackageRoute.includes('{{app}}')) {
      return `${this.replaceOrgAndApp(selectedPackageRoute)}${queryParams ?? ''}`;
    }

    return `${selectedPackageRoute}${queryParams ?? ''}`;
  }

  private replaceOrgAndApp(url: string): string {
    return url.replace('{{org}}', this.org).replace('{{app}}', this.app);
  }
}
