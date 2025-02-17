import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { BasePage } from '../../helpers/BasePage';
import type { Environment } from '../../helpers/StudioEnvironment';

export class OrgLibraryPage extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async loadOrgLibraryPage(): Promise<void> {
    await this.page.goto(this.getRoute('orgLibrary'));
  }

  public async verifyOrgLibraryPage(): Promise<void> {
    await this.page.waitForURL(this.getRoute('orgLibrary'));
  }

  public async waitForPageHeaderToBeVisible(): Promise<void> {
    const heading = this.page.getByRole('heading', {
      name: this.textMock('app_content_library.library_heading'),
      level: 1,
      exact: true,
    });

    await expect(heading).toBeVisible();
  }
}
