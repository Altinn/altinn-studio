export type Environment = {
  org?: string;
  app?: string;
};

export class StudioEnvironment {
  public readonly org: string;
  public app: string;
  public readonly designerAppName: string;
  public giteaAccessToken: string = process.env.GITEA_ACCESS_TOKEN;

  constructor(private environment?: Environment) {
    this.org = this.environment?.org ?? process.env.PLAYWRIGHT_USER;
    this.app = this.environment?.app ?? process.env.PLAYWRIGHT_DESIGNER_APP_NAME;
  }

  public updateAppNameEnv(appName: string): void {
    this.app = appName;
  }
}
