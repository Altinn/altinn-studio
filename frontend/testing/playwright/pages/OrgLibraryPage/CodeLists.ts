import { BasePage } from '../../helpers/BasePage';
import { expect, type Page } from '@playwright/test';

export class CodeLists extends BasePage {
  constructor(public page: Page) {
    super(page);
  }

  public async waitForCodeListPageToLoad(): Promise<void> {
    const heading = this.page.getByRole('heading', {
      name: this.textMock('app_content_library.code_lists.page_name'),
      level: 1,
      exact: true,
    });

    await expect(heading).toBeVisible();
  }

  public async verifyThatCodeListPageIsEmpty(): Promise<void> {
    const emptyStateText = this.page.getByText(
      this.textMock('app_content_library.code_lists.code_lists_count_info_none'),
    );

    await expect(emptyStateText).toBeVisible();
  }
}
