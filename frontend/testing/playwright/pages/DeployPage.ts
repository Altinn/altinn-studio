import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';

export class DeployPage extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async loadDeployPage(): Promise<void> {
    await this.page.goto(this.getRoute('deploy'));
  }

  public async verifyDeployPage(): Promise<void> {
    await this.page.waitForURL(this.getRoute('deploy'));
  }
}
