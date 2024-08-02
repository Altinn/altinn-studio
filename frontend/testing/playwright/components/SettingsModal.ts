import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';

export type SettingsModalTab = 'about' | 'access_control' | 'policy' | 'setup';

export class SettingsModal extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async verifyThatSettingsModalIsOpen(): Promise<void> {
    await this.page
      .getByRole('heading', {
        name: this.textMock('settings_modal.heading'),
        level: 1,
        exact: true,
      })
      .isVisible();
  }

  public async clickOnCloseSettingsModalButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: 'close modal', // Todo: Replace with this.textMock('settings_modal.close_button_label') when https://github.com/digdir/designsystemet/issues/2195 is fixed
        exact: true,
      })
      .click();
  }

  public async verifyThatSettingsModalIsNotOpen(): Promise<void> {
    await this.page
      .getByRole('heading', {
        name: this.textMock('settings_modal.heading'),
        level: 1,
        exact: true,
      })
      .isHidden();
  }

  public async navigateToTab(tab: SettingsModalTab): Promise<void> {
    await this.page
      .getByRole('tab', { name: this.textMock(`settings_modal.left_nav_tab_${tab}`), exact: true })
      .click();
  }

  public async verifyThatTabIsVisible(tabHeading: SettingsModalTab): Promise<void> {
    await this.page
      .getByRole('heading', {
        name: this.textMock(`settings_modal.${tabHeading}_tab_heading`),
        level: 2,
        exact: true,
      })
      .isVisible();
  }

  public async verifyThatTabIsHidden(tabHeading: SettingsModalTab): Promise<void> {
    await this.page
      .getByRole('heading', {
        name: this.textMock(`settings_modal.${tabHeading}_tab_heading`),
        level: 2,
        exact: true,
      })
      .isHidden();
  }
}
