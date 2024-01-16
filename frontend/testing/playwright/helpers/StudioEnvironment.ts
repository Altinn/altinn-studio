export type Environment = {
  org?: string;
  app?: string;
};

export class StudioEnvironment {
  public readonly org: string;
  public app: string;
  public readonly designerAppName: string;

  constructor(private environment?: Environment) {
    this.org = this.environment?.org ?? process.env.PLAYWRIGHT_USER;
    this.app = this.environment?.app ?? process.env.PLAYWRIGHT_DESIGNER_APP_NAME;

    // TODO - WHY IS THIS UNDEFINED
    console.log(
      'In StudioEnvironment.ts - this?.environment?.app: ',
      this?.environment?.app ?? 'undefined',
    );
  }

  public updateAppNameEnv(appName: string): void {
    this.app = appName;
  }
}
