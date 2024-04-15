import type { APIRequestContext } from '@playwright/test';

export class GiteaApi {
  private readonly org: string;
  private readonly repoName: string;
  private giteaAccessToken: string = process.env.GITEA_ACCESS_TOKEN;

  constructor() {
    this.org = process.env.PLAYWRIGHT_RESOURCES_ORGANIZATION;
    this.repoName = process.env.PLAYWRIGHT_RESOURCES_REPO_NAME;
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
      `/repos/api/v1/repos/${this.org}/${this.repoName}?token=${this.giteaAccessToken}`,
    );
  }
}
