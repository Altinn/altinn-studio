import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Download, Page } from '@playwright/test';

export class LocalChangesModal extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async clickOnDeleteLocalChangesButton(): Promise<void> {
    await this.page
      .getByRole('button', { name: this.textMock('local_changes.modal_delete_button') })
      .click();
  }

  public async writeAppNameInConfirmTextfield(appName: string): Promise<void> {
    await this.page
      .getByRole('textbox', {
        name: this.textMock('local_changes.modal_delete_modal_textfield_label'),
      })
      .fill(appName);
  }

  public async clickOnDeleteMyChangesButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('local_changes.modal_confirm_delete_button'),
      })
      .click();
  }

  public async verifyThatDeleteLocalChangesSuccessPageReload(): Promise<void> {
    await this.page.waitForLoadState('load');
  }

  public getDownloadPromise(): Promise<Download> {
    return this.page.waitForEvent('download');
  }

  public async clickOnDownloadRepoZipButton(): Promise<void> {
    await this.page
      .getByRole('link', { name: this.textMock('local_changes_modal.download_all_button') })
      .click();
  }

  public async clickOnDownloadOnlyLocalChangesZipButton(): Promise<void> {
    await this.page
      .getByRole('link', {
        name: this.textMock('local_changes.modal_download_only_changed_button'),
      })
      .click();
  }
}
