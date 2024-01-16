import { APIRequestContext, APIResponse } from '@playwright/test';
import { Environment, StudioEnvironment } from './StudioEnvironment';

export class DesignerApi extends StudioEnvironment {
  constructor(environment?: Environment) {
    super(environment);
    console.log('env.app inside DesignerApi constructor', this.app);
  }

  public async createApp(request: APIRequestContext): Promise<APIResponse> {
    console.log('this.app inside createApp', this.app);
    const response = await request.post(
      `studio.localhost/designer/api/repos/create-app?org=${this.org}&repository=${this.app}&datamodellingPreference=1`,
    );
    return response;
  }
}

/*
import { request } from '@playwright/test';
import { Environment, StudioEnvironment } from './StudioEnvironment';

export class DesignerApi extends StudioEnvironment {
  constructor(environment?: Environment) {
    super(environment);
  }

  public async createApp(environment?: Environment): Promise<void> {
    const org = environment?.org || this.org;
    const app = environment?.app || this.app;

    const context = await request.newContext();
    await context.post(
      `studio.localhost/designer/api/repos/create-app?org=${org}&repository=${app}&datamodellingPreference=1`,
    );
  }
}
*/

/*
import { request } from '@playwright/test';
import { Environment, StudioEnvironment } from './StudioEnvironment';

export class DesignerApi extends StudioEnvironment {
  constructor() {
    super();
  }

  public async createApp(app: string): Promise<void> {
    const context = await request.newContext();
    await context.post(
      `studio.localhost/designer/api/repos/create-app?org=${this.org}&repository=${app}&datamodellingPreference=1`,
    );
  }
}
*/
