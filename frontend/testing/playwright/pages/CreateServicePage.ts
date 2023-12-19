import { Page } from '@playwright/test';
import { BasePage } from '../helpers/BasePage';

export class CreateServicePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  public async goToCreateAppForm(): Promise<void> {
    await this.page.goto(this.getRoute('dashboardCreateApp'));
  }

  public async writeAppName(appName: string): Promise<void> {
    await this.page.getByLabel('Navn').fill(appName);
    return this.updateAppNameEnv(appName);
  }

  public async clickOnCreateAppButton(): Promise<void> {
    await this.page.getByRole('button', { name: 'Opprett applikasjon' }).click();
  }

  public async redirectedToEditorOverview(): Promise<void> {
    await this.page.waitForURL(this.getRoute('editorOverview'));
  }
}
