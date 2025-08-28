import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';
import type { SettingsPageTab } from '../types/SettingsPageTab';

export class SettingsPage extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async loadSettingsPage(): Promise<void> {
    await this.page.goto(this.getRoute('appSettings'));
  }

  public async verifySettingsPage(): Promise<void> {
    await this.page.waitForURL(this.getRoute('appSettings'));
  }

  public async verifyThatTabIsVisible(tabHeading: SettingsPageTab): Promise<void> {
    await this.page
      .getByRole('heading', {
        name: this.textMock(`app_settings.${tabHeading}_tab_heading`),
        level: 3,
        exact: true,
      })
      .isVisible();
  }

  public async verifyThatTabIsHidden(tabHeading: SettingsPageTab): Promise<void> {
    await this.page
      .getByRole('heading', {
        name: this.textMock(`app_settings.${tabHeading}_tab_heading`),
        level: 3,
        exact: true,
      })
      .isHidden();
  }

  public async navigateToTab(tab: SettingsPageTab): Promise<void> {
    await this.page
      .getByRole('tab', { name: this.textMock(`app_settings.left_nav_tab_${tab}`), exact: true })
      .click();
  }
}
