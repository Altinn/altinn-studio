import { DataTestId } from '../enum/DataTestId';
import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

type TopMenuName =
  | 'about'
  | 'create'
  | 'dashboard'
  | 'data_model'
  | 'deploy'
  | 'preview'
  | 'preview_back_to_editing'
  | 'process_editor'
  | 'texts';

const TIMEOUT_FOR_GITEA_TO_DO_THE_PUSH: number = 10000;

export class Header extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async clickOnNavigateToPageInTopMenuHeader(menuName: TopMenuName): Promise<void> {
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
      .getByLabel('', { exact: true })
      .getByRole('button', { name: this.textMock('sync_header.changes_to_share') })
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
    const heading = this.page.getByText(this.textMock('sync_header.sharing_changes_completed'));
    await expect(heading).toBeVisible({ timeout: TIMEOUT_FOR_GITEA_TO_DO_THE_PUSH });
  }

  public async clickOnLocalChangesButton(): Promise<void> {
    await this.page
      .getByRole('button', { name: this.textMock('sync_header.local_changes') })
      .click();
  }

  public async clickOnOpenSettingsModalButton(): Promise<void> {
    await this.page.getByRole('button', { name: this.textMock('sync_header.settings') }).click();
  }

  public async waitForPushToGiteaSpinnerToDisappear(): Promise<void> {
    const spinner = this.page.getByTestId(DataTestId.PushToGiteaSpinner);
    await expect(spinner).toBeHidden({ timeout: TIMEOUT_FOR_GITEA_TO_DO_THE_PUSH });
  }
}
