type ParamsOptions = {
  org?: string;
  app?: string;
};

type PackagesRoute =
  | 'dashboard'
  | 'editorOverview'
  | 'editorUiEditor'
  | 'preview'
  | 'editorPublish';

const packagesRoutes = {
  dashboard: '/dashboard',
  editorOverview: '/editor/{{org}}/{{app}}/overview',
  editorUiEditor: '/editor/{{org}}/{{app}}/ui-editor',
  editorPublish: '/editor/{{org}}/{{app}}/deploy',
  preview: '/preview/{{org}}/{{app}}',
};

export class PackagesRouter {
  private app: string;
  private org: string;

  constructor(private paramsOptions: ParamsOptions) {
    this.app = this.paramsOptions.app ?? '';
    this.org = this.paramsOptions.org ?? '';
  }

  public navigateToPackage(packageRoute: PackagesRoute, subUrl?: string): void {
    window.location.assign(`${this.getPackageNavigationUrl(packageRoute)}${subUrl ? subUrl : ''}`);
  }

  public getPackageNavigationUrl(packageRoute: PackagesRoute): string {
    const selectedPackageRoute = packagesRoutes[packageRoute];

    if (selectedPackageRoute.includes('{{org}}') || selectedPackageRoute.includes('{{app}}')) {
      return this.replaceOrgAndApp(selectedPackageRoute);
    }

    return selectedPackageRoute;
  }

  private replaceOrgAndApp(url: string): string {
    return url.replace('{{org}}', this.org).replace('{{app}}', this.app);
  }
}
