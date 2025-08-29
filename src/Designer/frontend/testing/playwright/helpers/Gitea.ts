import type { Environment } from './StudioEnvironment';
import { StudioEnvironment } from './StudioEnvironment';

export class Gitea extends StudioEnvironment {
  public giteaAccessToken: string = process.env.GITEA_ACCESS_TOKEN;

  constructor(environment?: Environment) {
    super(environment);
  }

  public getDeleteAppEndpoint(environment?: Environment): string {
    const org = environment?.org || this.org;
    const app = environment?.app || this.app;
    return `/repos/api/v1/repos/${org}/${app}?token=${this.giteaAccessToken}`;
  }
}
