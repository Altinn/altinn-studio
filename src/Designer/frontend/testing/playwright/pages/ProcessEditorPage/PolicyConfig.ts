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

  public async waitForNavigateToPolicyLinkIsVisible(): Promise<void> {
    const link = this.page.getByRole('link', {
      name: this.textMock('process_editor.configuration_panel.edit_policy_open_policy_editor_link'),
    });
    await expect(link).toBeVisible();
  }

  public async clickOnNavigateToPolicyEditorLink(): Promise<void> {
    await this.page
      .getByRole('link', {
        name: this.textMock(
          'process_editor.configuration_panel.edit_policy_open_policy_editor_link',
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

  public async verifyThatPolicyEditorIsClosed(): Promise<void> {
    const heading = this.page.getByRole('heading', {
      name: this.textMock('policy_editor.rules'),
      level: 4,
    });
    await expect(heading).toBeHidden();
  }
}
