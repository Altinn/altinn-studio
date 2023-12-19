import { BasePage } from '../helpers/BasePage';
import { Page } from '@playwright/test';

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  public async goToDashboard(): Promise<void> {
    await this.page.goto(this.getRoute('dashboard'));
    await this.page.waitForURL(this.getRoute('dashboard'));
  }

  public async clickOnCreateAppLink(): Promise<void> {
    await this.page.getByRole('link', { name: 'Opprett ny applikasjon' }).click();
  }

  public async confirmNavigationToCreateAppForm(): Promise<void> {
    await this.page.waitForURL(this.getRoute('dashboardCreateApp'));
  }
}
