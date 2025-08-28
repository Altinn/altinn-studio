import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';

export class OverviewPage extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async loadOverviewPage(): Promise<void> {
    await this.page.goto(this.getRoute('editorOverview'));
  }

  public async verifyOverviewPage(useTtdAsOrg: boolean = false): Promise<void> {
    await this.page.waitForURL(this.getRoute('editorOverview', useTtdAsOrg));
  }
}
