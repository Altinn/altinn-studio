import { Page } from '@playwright/test';
import { BasePage } from '../helpers/BasePage';

export class CreateServicePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  public async loadCreateAppFormPage(): Promise<void> {
    await this.page.goto(this.getRoute('dashboardCreateApp'));
  }

  public createAppFormIsVisible(): void {
    this.page.getByLabel('Navn');
  }

  public async writeAppName(appName: string): Promise<void> {
    await this.page.getByLabel('Navn').fill(appName);
    return this.updateAppNameEnv(appName);
  }

  public async clickOnCreateAppButton(): Promise<void> {
    await this.page.getByRole('button', { name: 'Opprett applikasjon' }).click();
  }

  public async verifyIsOverviewPage(): Promise<void> {
    await this.page.waitForURL(this.getRoute('editorOverview'));
  }
}
