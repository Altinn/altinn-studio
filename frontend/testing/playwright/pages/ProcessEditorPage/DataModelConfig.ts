import { expect, type Page } from '@playwright/test';
import { BasePage } from '@studio/testing/playwright/helpers/BasePage';

export class DataModelConfig extends BasePage {
  constructor(public page: Page) {
    super(page);
  }

  public async clickOnDesignAccordion(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_design_title'),
      })
      .click();
  }

  public async clickOnDataModelButton(dataModelName: string): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_set_data_model', {
          dataModelName,
        }),
      })
      .click();
  }

  public async waitForComboboxToBeVisible(): Promise<void> {
    const combobox = this.page.getByRole('combobox', {
      name: this.textMock('process_editor.configuration_panel_set_data_model_label'),
    });
    await expect(combobox).toBeVisible();
  }

  public async clickOnDeleteDataModel(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('general.delete'),
      })
      .click();
  }

  public async waitForAddDataModelButtonWithoutValueToBeVisible(): Promise<void> {
    const button = this.page.getByRole('button', {
      name: this.textMock('process_editor.configuration_panel_set_data_model_link'),
    });
    await expect(button).toBeVisible();
  }

  public async clickOnAddButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_set_data_model_link'),
      })
      .click();
  }

  public async clickOnCombobox(): Promise<void> {
    await this.page
      .getByRole('combobox', {
        name: this.textMock('process_editor.configuration_panel_set_data_model_label'),
      })
      .click();
  }

  public async chooseOption(option: string): Promise<void> {
    await this.page.getByRole('option', { name: option }).click();
  }

  public async waitForDataModelButtonToBeVisibleWithValue(dataModelName: string): Promise<void> {
    const button = this.page.getByRole('button', {
      name: this.textMock('process_editor.configuration_panel_set_data_model', {
        dataModelName,
      }),
    });
    await expect(button).toBeVisible();
  }

  public async verifyDataModelButtonTextIsSelectedDataModel(option: string): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_set_data_model', {
          dataModelName: option,
        }),
      })
      .isVisible();
  }

  public async verifyThatAddNewDataModelLinkButtonIsHidden(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_set_data_model_link'),
      })
      .isHidden();
  }

  public async verifyThatThereAreNoDataModelsAvailable(): Promise<void> {
    const noDataModelMessage = this.page.getByText(
      this.textMock('process_editor.configuration_panel_no_data_model_to_select'),
    );
    await expect(noDataModelMessage).toBeVisible();
  }

  public async clickOnAddDataModelCombobox(): Promise<void> {
    await this.page
      .getByRole('combobox', {
        name: this.textMock(
          'process_editor.configuration_panel_custom_receipt_select_data_model_label',
        ),
      })
      .click();
  }
}
