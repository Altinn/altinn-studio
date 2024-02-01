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

  public async clickOnThreeDotsMenu(): Promise<void> {
    await this.page.getByRole('button', { name: this.textMock('sync_header.gitea_menu') }).click();
  }

  public async clickOnGoToGiteaRepository(): Promise<void> {
    await this.page.getByRole('link', { name: this.textMock('sync_header.repository') }).click();
  }

  public async clickOnUploadLocalChangesButton(): Promise<void> {
    await this.page
      .getByRole('button', { name: this.textMock('sync_header.no_changes_to_share') })
      .click();
  }

  public async clickOnValidateChanges(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('sync_header.describe_and_validate_btnText'),
      })
      .click();
  }

  public async checkThatUploadSuccessMessageIsVisible(): Promise<void> {
    await this.page
      .getByRole('heading', {
        name: this.textMock('sync_header.sharing_changes_completed'),
        level: 3,
      })
      .isVisible();
  }

  public async clickOnLocalChangesButton(): Promise<void> {
    await this.page
      .getByRole('button', { name: this.textMock('sync_header.local_changes') })
      .click();
  }

  public async clickOnOpenSettingsModalButton(): Promise<void> {
    await this.page.getByRole('button', { name: this.textMock('sync_header.settings') }).click();
  }
}
