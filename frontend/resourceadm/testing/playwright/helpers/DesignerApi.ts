import type { APIRequestContext } from '@playwright/test';
import type { Cookie, StorageState } from '../types/StorageState';

export class DesignerApi {
  private readonly org: string;
  private readonly repoName: string;
  private readonly resourceId: string;

  constructor(resourceId?: string) {
    this.org = process.env.PLAYWRIGHT_RESOURCES_ORGANIZATION;
    this.repoName = process.env.PLAYWRIGHT_RESOURCES_REPO_NAME;
    this.resourceId = resourceId;
  }

  public async createResource(
    request: APIRequestContext,
    storageState: StorageState,
    resourceId: string = this.resourceId,
  ) {
    const xsrfToken: string = this.getXsrfTokenFromStorageState(storageState);
    const response = await request.post(`/designer/api/${this.org}/resources/addresource`, {
      // The following header is needed to be able to do API requestes
      headers: {
        'X-Xsrf-Token': xsrfToken,
        'Content-type': 'application/json',
      },
      data: JSON.stringify({
        identifier: resourceId,
        title: { nb: resourceId, nn: '', en: '' },
      }),
    });
    return response;
  }

  public async resetResourceRepo(request: APIRequestContext, storageState: StorageState) {
    const xsrfToken: string = this.getXsrfTokenFromStorageState(storageState);
    const response = await request.get(
      `/designer/api/repos/repo/${this.org}/${this.repoName}/reset`,
      {
        // The following header is needed to be able to do API requestes
        headers: {
          'X-Xsrf-Token': xsrfToken,
        },
      },
    );
    return response;
  }

  private getXsrfTokenFromStorageState(storageState: StorageState): string {
    const fs = require('fs');
    const jsonData = fs.readFileSync(storageState, 'utf-8');
    const formattedStorageState: StorageState = JSON.parse(jsonData);
    return formattedStorageState.cookies.find((cookie: Cookie) => cookie.name === 'XSRF-TOKEN')
      .value;
  }
}
