import { expect, type Page } from '@playwright/test';
import { BasePage } from '../../helpers/BasePage';

export class SigningTaskConfig extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  public async clickDataTypesToSignCombobox(): Promise<void> {
    await this.page
      .getByRole('combobox', {
        name: this.textMock('process_editor.configuration_panel_set_data_types_to_sign'),
      })
      .click();
  }

  public async clickOnDataTypesToSignOption(option: string): Promise<void> {
    await this.page.getByRole('option', { name: option }).click();
  }

  public async waitForDataTypeToSignButtonToBeVisible(option: string): Promise<void> {
    const button = this.page.getByLabel(this.textMock('general.delete_item', { item: option }));
    await expect(button).toBeVisible();
  }
}
