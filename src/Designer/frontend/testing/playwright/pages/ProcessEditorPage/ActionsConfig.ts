import { BasePage } from '@studio/testing/playwright/helpers/BasePage';
import { expect, type Page } from '@playwright/test';

export class ActionsConfig extends BasePage {
  constructor(public page: Page) {
    super(page);
  }

  public async clickOnActionsAccordion(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_actions_title'),
      })
      .click();
  }

  public async waitForAddActionsButtonToBeVisible(): Promise<void> {
    const button = this.page.getByRole('button', {
      name: this.textMock('process_editor.configuration_panel_actions_add_new'),
    });
    await expect(button).toBeVisible();
  }

  public async clickAddActionsButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_actions_add_new'),
      })
      .click();
  }

  public async choosePredefinedAction(action: string): Promise<void> {
    const predefinedActionsSelect = this.page
      .getByLabel(this.textMock('process_editor.configuration_panel_actions_action_selector_label'))
      .first();
    await expect(predefinedActionsSelect).toBeVisible();
    await predefinedActionsSelect.selectOption({ label: action });
  }

  public async clickOnCustomActionTab(): Promise<void> {
    await this.page.getByRole('tab', { name: 'Lag egendefinert handling' }).first().click();

    const customActionTextfield = this.page.getByLabel(
      this.textMock('process_editor.configuration_panel_actions_action_card_custom_label'),
    );

    await expect(customActionTextfield).toBeVisible();
  }

  public async writeCustomAction(customAction: string): Promise<void> {
    await this.page
      .getByRole('textbox', {
        name: this.textMock('process_editor.configuration_panel_actions_action_card_custom_label'),
      })
      .fill(customAction);
  }

  public async makeCustomActionToServerAction(): Promise<void> {
    await this.page
      .getByRole('checkbox', {
        name: this.textMock('process_editor.configuration_panel_actions_set_server_action_label'),
      })
      .click();
  }

  public async editAction(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_actions_action_label', {
          actionIndex: '1',
        }),
      })
      .click();
  }

  public async deleteAction(action: string): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('general.delete', { name: action }),
      })
      .click();
  }
}
