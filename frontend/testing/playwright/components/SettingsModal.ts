import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';

export type SettingsModalTab = 'about' | 'accessControl' | 'policy' | 'setup';
type SettingsModalTabHeading = 'about' | 'access_control' | 'policy' | 'setup';

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

  public async navigateToTab(tab: SettingsModalTab): Promise<void> {
    await this.page
      .getByRole('tab', { name: this.textMock(`settings_modal.left_nav_tab_${tab}`) })
      .click();
  }

  public async verifyThatTabIsVisible(tabHeading: SettingsModalTabHeading): Promise<void> {
    await this.page
      .getByRole('heading', {
        name: this.textMock(`settings_modal.${tabHeading}_tab_heading`),
        level: 2,
      })
      .isVisible();
  }

  public async verifyThatTabIsHidden(tabHeading: SettingsModalTabHeading): Promise<void> {
    await this.page
      .getByRole('heading', {
        name: this.textMock(`settings_modal.${tabHeading}_tab_heading`),
        level: 2,
      })
      .isHidden();
  }
}
