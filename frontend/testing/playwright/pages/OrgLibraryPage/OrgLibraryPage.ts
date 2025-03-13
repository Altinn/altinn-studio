import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { BasePage } from '../../helpers/BasePage';
import type { Environment } from '../../helpers/StudioEnvironment';
import { CodeLists } from './CodeLists';

export class OrgLibraryPage extends BasePage {
  public readonly codeLists: CodeLists;

  constructor(page: Page, environment?: Environment) {
    super(page, environment);
    this.codeLists = new CodeLists(page);
  }

  public async loadOrgLibraryPage(): Promise<void> {
    await this.page.goto(this.getRoute('orgLibrary'));
  }

  public async verifyOrgLibraryPage(): Promise<void> {
    await this.page.waitForURL(this.getRoute('orgLibrary'));
  }

  public async waitForPageHeaderToBeVisible(): Promise<void> {
    const headingText = `${this.textMock('app_content_library.library_heading')} Beta`;

    const heading = this.page.getByRole('heading', {
      name: headingText,
      level: 1,
      exact: true,
    });

    await expect(heading).toBeVisible();
  }

  public async clickOnNavigateToCodeListPage(): Promise<void> {
    await this.page
      .getByRole('tab', { name: this.textMock('app_content_library.code_lists.page_name') })
      .click();
  }
}
