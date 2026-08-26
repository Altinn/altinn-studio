import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { Environment } from './StudioEnvironment';
import { StudioEnvironment } from './StudioEnvironment';
import type { Cookie, StorageState } from '../types/StorageState';
import type { AppTemplate } from '../enum/AppTemplate';

export type CreateAppOptions = {
  org?: string;
  // App template id of the app scaffold (v8/v9) to create the app from. Omitted requests use the backend default.
  appTemplate?: AppTemplate;
};

export class DesignerApi extends StudioEnvironment {
  constructor(environment?: Environment) {
    super(environment);
  }

  public async createApp(
    request: APIRequestContext,
    storageState: StorageState,
    options: CreateAppOptions = {},
  ): Promise<APIResponse> {
    const headers = this.generateHeaders(storageState);
    const requestBody = {
      org: options.org ?? this.org,
      repository: this.app,
      appTemplate: options.appTemplate,
    };
    return request.post(`/designer/api/repos/create-app`, { headers, data: requestBody });
  }

  private generateHeaders(storageState: StorageState): Record<string, string> {
    const xsrfToken: string = this.getXsrfTokenFromStorageState(storageState);
    return {
      'X-Xsrf-Token': xsrfToken,
      'Content-Type': 'application/json',
    };
  }

  private getXsrfTokenFromStorageState(storageState: StorageState): string {
    const fs = require('fs');
    const jsonData = fs.readFileSync(storageState, 'utf-8');
    const formattedStorageState: StorageState = JSON.parse(jsonData);
    return formattedStorageState.cookies.find((cookie: Cookie) => cookie.name === 'XSRF-TOKEN')
      .value;
  }
}
