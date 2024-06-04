import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class ProcessEditorPage extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async loadProcessEditorPage(): Promise<void> {
    await this.page.goto(this.getRoute('editorProcess'));
  }

  public async verifyProcessEditorPage(): Promise<void> {
    await this.page.waitForURL(this.getRoute('editorProcess'));
  }

  public async clickOnInitialTask(elementSelector: string): Promise<void> {
    await this.page.click(elementSelector);
  }

  public async waitForInitialTaskHeaderToBeVisible(): Promise<void> {
    const heading = this.page.getByRole('heading', {
      name: this.textMock('process_editor.configuration_panel_data_task'),
    });

    await expect(heading).toBeVisible();
  }

  public async clickOnDataModelButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_set_data_model'),
      })
      .click();
  }

  public async waitForDataModelComboboxToBeVisible(): Promise<void> {
    const combobox = this.page.getByRole('combobox', {
      name: this.textMock('process_editor.configuration_panel_set_data_model'),
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

  public async waitForAddDataModelButtonToBeVisible(): Promise<void> {
    const button = this.page.getByRole('button', {
      name: this.textMock('process_editor.configuration_panel_set_data_model_link'),
    });
    await expect(button).toBeVisible();
  }

  public async clickOnAddDataModel(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_set_data_model_link'),
      })
      .click();
  }

  public async clickOnDataModelCombobox(): Promise<void> {
    await this.page
      .getByRole('combobox', {
        name: this.textMock('process_editor.configuration_panel_set_data_model'),
      })
      .click();
  }

  public async clickOnDataModelOption(option: string): Promise<void> {
    await this.page.getByRole('option', { name: option }).click();
  }

  public async waitForDataModelButtonToBeVisible(): Promise<void> {
    const button = this.page.getByRole('button', {
      name: this.textMock('process_editor.configuration_panel_set_data_model'),
    });
    await expect(button).toBeVisible();
  }

  public async verifyDataModelButtonTextIsSelectedDataModel(option: string): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_set_data_model') + option,
      })
      .isVisible();
  }

  public async verifyThatAddNewDataModelButtonIsHidden(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_set_data_model_link'),
      })
      .isHidden();
  }
}
