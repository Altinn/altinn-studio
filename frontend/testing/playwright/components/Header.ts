import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';

type TopMenuNames =
  | 'about'
  | 'create'
  | 'dashboard'
  | 'datamodel'
  | 'deploy'
  | 'preview'
  | 'preview_back_to_editing'
  | 'process-editor'
  | 'texts';

export class Header extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async clickOnNavigateToPageInTopMenuHeader(menuName: TopMenuNames): Promise<void> {
    await this.page
      .getByRole('link', { name: this.textMock(`top_menu.${menuName}`), exact: true })
      .first()
      .click();
  }
}
