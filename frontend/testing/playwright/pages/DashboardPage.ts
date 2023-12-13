import { BasePage } from '../helpers/BasePage';
import { Page } from '@playwright/test';

export class DashboardPage extends BasePage {
  constructor(page: Page, org: string, app: string) {
    super(page, org, app);
  }

  public async goToDashboard(): Promise<void> {
    await this._page.goto(this.getRoute('dashboard'));
    await this._page.waitForURL(this.getRoute('dashboard'));
  }

  public async clickOnCreateAppLink(): Promise<void> {
    await this._page.getByRole('link', { name: 'Opprett ny applikasjon' }).click();
  }

  public async confirmNavigationToCreateAppForm(): Promise<void> {
    await this._page.waitForURL(this.getRoute('dashboardCreateApp'));
  }

  public async writeAppName(appName: string): Promise<void> {
    await this._page.getByLabel('Navn').fill(appName);
  }

  public async clickOnCreateAppButton(): Promise<void> {
    await this._page.getByRole('button', { name: 'Opprett applikasjon' }).click();
  }

  public async verifyCreateAppIsSuccessful(): Promise<void> {
    await this._page.waitForURL(this.getRoute('editorOverview'));
  }
}
