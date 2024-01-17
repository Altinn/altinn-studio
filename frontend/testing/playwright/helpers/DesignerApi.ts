import { APIRequestContext, APIResponse } from '@playwright/test';
import { Environment, StudioEnvironment } from './StudioEnvironment';

export class DesignerApi extends StudioEnvironment {
  constructor(environment?: Environment) {
    super(environment);
  }

  public async createApp(request: APIRequestContext, xsrfToken: string): Promise<APIResponse> {
    const response = await request.post(
      `/designer/api/repos/create-app?org=${this.org}&repository=${this.app}&datamodellingPreference=1`,
      {
        // The following header is needed to be able to do API requestes
        headers: {
          'X-Xsrf-Token': xsrfToken,
        },
      },
    );
    return response;
  }
}
