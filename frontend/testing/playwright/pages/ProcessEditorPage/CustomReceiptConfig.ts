import { expect, type Page } from '@playwright/test';
import { BasePage } from '../../helpers/BasePage';

export class CustomReceiptConfig extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  public async clickOnReceiptAccordion(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_custom_receipt_accordion_header'),
      })
      .click();
  }

  public async waitForCreateCustomReceiptButtonToBeVisible(): Promise<void> {
    const text = this.page.getByRole('button', {
      name: this.textMock(
        'process_editor.configuration_panel_custom_receipt_create_your_own_button',
      ),
    });
    await expect(text).toBeVisible();
  }

  public async clickOnCreateCustomReceipt(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock(
          'process_editor.configuration_panel_custom_receipt_create_your_own_button',
        ),
      })
      .click();
  }

  public async waitForLayoutTextfieldToBeVisible(): Promise<void> {
    const textbox = this.page.getByRole('textbox', {
      name: this.textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
    });
    await expect(textbox).toBeVisible();
  }

  public async waitForSaveNewCustomReceiptButtonToBeVisible(): Promise<void> {
    const button = this.page.getByRole('button', {
      name: this.textMock('process_editor.configuration_panel_custom_receipt_create_button'),
    });
    await expect(button).toBeVisible();
  }

  public async clickOnSaveNewCustomReceiptButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_custom_receipt_create_button'),
      })
      .click();
  }

  public async waitForEditLayoutSetIdButtonToBeVisible(): Promise<void> {
    const button = this.page.getByRole('button', {
      name: this.textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
    });
    await expect(button).toBeVisible();
  }

  public async writeLayoutSetId(layoutSetId: string): Promise<void> {
    await this.page
      .getByRole('textbox', {
        name: this.textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
      })
      .fill(layoutSetId);
  }
}
