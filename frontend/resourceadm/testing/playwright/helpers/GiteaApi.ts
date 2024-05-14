import type { APIRequestContext } from '@playwright/test';
import { ResourceEnvironment } from './ResourceEnvironment';
import type { Environment } from '../helpers/ResourceEnvironment';

export class GiteaApi extends ResourceEnvironment {
  private giteaAccessToken: string = process.env.GITEA_ACCESS_TOKEN;

  constructor(environment?: Environment) {
    super(environment);
  }

  public async createResourcesRepo(request: APIRequestContext): Promise<void> {
    await request.post(`/repos/api/v1/orgs/${this.org}/repos?token=${this.giteaAccessToken}`, {
      data: JSON.stringify({
        name: `${this.org}-resources`,
      }),
      headers: {
        'Content-type': 'application/json',
      },
    });
  }

  public async deleteResourcesRepo(request: APIRequestContext): Promise<void> {
    await request.delete(
      `/repos/api/v1/repos/${this.org}/${this.repo}?token=${this.giteaAccessToken}`,
    );
  }
}
