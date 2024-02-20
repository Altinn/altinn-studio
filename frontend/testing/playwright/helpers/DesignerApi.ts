import type { APIRequestContext, APIResponse } from '@playwright/test';
import { StudioEnvironment, type Environment } from './StudioEnvironment';
import type { Cookie, StorageState } from '../types/StorageState';

export class DesignerApi extends StudioEnvironment {
  constructor(environment?: Environment) {
    super(environment);
  }

  public async createApp(
    request: APIRequestContext,
    storageState: StorageState,
    org = this.org,
  ): Promise<APIResponse> {
    const xsrfToken: string = this.getXsrfTokenFromStorageState(storageState);
    const response = await request.post(
      `/designer/api/repos/create-app?org=${org}&repository=${this.app}&datamodellingPreference=1`,
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
