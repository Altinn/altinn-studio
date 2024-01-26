import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';

export class GiteaPage extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async loadGiteaPage(): Promise<void> {
    await this.page.goto(this.getRoute('gitea'));
  }

  public async verifyGiteaPage(): Promise<void> {
    await this.page.waitForURL(this.getRoute('gitea'));
  }
}
