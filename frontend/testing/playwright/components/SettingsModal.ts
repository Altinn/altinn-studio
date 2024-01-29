import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';

export class SettingsModal extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async verifyThatSettingsModalIsOpen(): Promise<void> {
    await this.page
      .getByRole('heading', {
        name: this.textMock('settings_modal.heading'),
        level: 1,
      })
      .isVisible();
  }

  public async clickOnCloseSettingsModalButton(): Promise<void> {
    await this.page.getByRole('button', { name: this.textMock('modal.close_icon') }).click();
  }

  public async verifyThatSettingsModalIsNotOpen(): Promise<void> {
    await this.page
      .getByRole('heading', {
        name: this.textMock('settings_modal.heading'),
        level: 1,
      })
      .isHidden();
  }
}
