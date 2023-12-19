import { StudioEnvironment, Environment } from './StudioEnvironment';

export class Gitea extends StudioEnvironment {
  constructor(environment?: Environment) {
    super(environment);
  }

  public getDeleteAppEndpoint(environment?: Environment): string {
    const org = environment?.org || this.org;
    const app = environment?.app || this.app;
    return `/repos/api/v1/repos/${org}/${app}?token=${this.giteaAccessToken}`;
  }
}
