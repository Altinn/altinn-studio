import { DataTestId } from '../enum/DataTestId';
import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

type TopMenuName = 'about' | 'create' | 'data_model' | 'deploy' | 'process_editor' | 'texts';

const ALTINN_LOGO_TITLE: string = 'Altinn logo';

const TIMEOUT_FOR_GITEA_TO_DO_THE_PUSH: number = 10000;

export class AppDevelopmentHeader extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async verifyNoGeneralErrorMessage(): Promise<void> {
    const errorMessage = this.page.getByText(this.textMock('general.error_message'));
    await expect(errorMessage).toBeHidden();
  }

  public async clickOnNavigateToPageInTopMenuHeader(menuName: TopMenuName): Promise<void> {
    await this.page
      .getByRole('list')
      .getByRole('link', { name: this.textMock(`top_menu.${menuName}`) })
      .click();
  }

  public async clickOnPreviewButton(): Promise<void> {
    await this.page.getByRole('link', { name: this.textMock(`top_menu.preview`) }).click();
  }

  public async clickOnBackToCreatePage(): Promise<void> {
    await this.page
      .getByRole('link', { name: this.textMock(`top_menu.preview_back_to_editing`) })
      .click();
  }

  public async clickOnNavigateToDashboard(): Promise<void> {
    await this.page.getByRole('link', { name: ALTINN_LOGO_TITLE }).click();
  }

  public async clickOnThreeDotsMenu(): Promise<void> {
    await this.page.getByRole('button', { name: this.textMock('sync_header.gitea_menu') }).click();
  }

  public async clickOnGoToGiteaRepository(): Promise<void> {
    await this.page.getByRole('link', { name: this.textMock('sync_header.repository') }).click();
  }

  public async clickOnUploadLocalChangesButton(): Promise<void> {
    await this.page
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

  public async waitForPushToGiteaSpinnerToDisappear(): Promise<void> {
    const spinner = this.page.getByTestId(DataTestId.PushToGiteaSpinner);
    await expect(spinner).toBeHidden({ timeout: TIMEOUT_FOR_GITEA_TO_DO_THE_PUSH });
  }
}
