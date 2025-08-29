import type { Page } from '@playwright/test';
import { BasePage } from '../helpers/BasePage';

export class CreateServicePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  public async loadCreateAppFormPage(): Promise<void> {
    await this.page.goto(this.getRoute('dashboardCreateApp'));
  }

  public async verifyCreateAppFormPage(): Promise<void> {
    await this.page.waitForURL(this.getRoute('dashboardCreateApp'));
  }

  public async writeAppName(appName: string): Promise<void> {
    await this.page.getByLabel(this.textMock('dashboard.name')).fill(appName);
    return this.updateAppNameEnv(appName);
  }

  public async clickOnCreateAppButton(): Promise<void> {
    await this.page
      .getByRole('button', { name: this.textMock('dashboard.create_service_btn') })
      .click();
  }

  public async verifyIsNavigatedToOverviewPage(): Promise<void> {
    await this.page.waitForURL(this.getRoute('editorOverview'));
  }
}
