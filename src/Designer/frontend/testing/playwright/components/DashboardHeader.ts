import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';

type TopMenuName = 'dashboard' | 'library';

export class DashboardHeader extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async clickOnNavigateToPageInTopMenuHeader(menuName: TopMenuName): Promise<void> {
    await this.page
      .getByRole('link', { name: this.textMock(`dashboard.header_item_${menuName}`) })
      .click();
  }
}
