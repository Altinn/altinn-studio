import { expect, type Page } from '@playwright/test';
import { BasePage } from '../../helpers/BasePage';

export class PolicyConfig extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  public async clickOnPolicyAccordion(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_policy_title'),
      })
      .click();
  }

  public async waitForNavigateToPolicyButtonIsVisible(): Promise<void> {
    const button = this.page.getByRole('button', {
      name: this.textMock(
        'process_editor.configuration_panel.edit_policy_open_policy_editor_button',
      ),
    });
    await expect(button).toBeVisible();
  }

  public async clickOnNavigateToPolicyEditorButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock(
          'process_editor.configuration_panel.edit_policy_open_policy_editor_button',
        ),
      })
      .click();
  }

  public async verifyThatPolicyEditorIsOpen(): Promise<void> {
    const heading = this.page.getByRole('heading', {
      name: this.textMock('policy_editor.rules'),
      level: 4,
    });
    await expect(heading).toBeVisible();
  }

  public async closePolicyEditor(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: 'close modal', // Todo: Replace 'close modal' with this.textMock('settings_modal.close_button_label') when https://github.com/digdir/designsystemet/issues/2195 is fixed
      })
      .click();
  }

  public async verifyThatPolicyEditorIsClosed(): Promise<void> {
    const heading = this.page.getByRole('heading', {
      name: this.textMock('policy_editor.rules'),
      level: 4,
    });
    await expect(heading).toBeHidden();
  }
}
