import { BasePage, type TextKey } from '../helpers/BasePage';
import type { Locator, Page } from '@playwright/test';
import type { Environment } from '../helpers/StudioEnvironment';
import path from 'path';
import { expect } from '@playwright/test';
import { DataTestId } from '../enum/DataTestId';

export class DataModelPage extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async loadDataModelPage(): Promise<void> {
    await this.page.goto(this.getRoute('editorDataModel'));
  }

  public async verifyDataModelPage(): Promise<void> {
    await this.page.waitForURL(this.getRoute('editorDataModel'));
  }

  public async clickOnCreateNewDataModelButton(): Promise<void> {
    await this.page.getByRole('button', { name: this.textMock('general.create_new') }).click();
  }

  public async typeDataModelName(name: string): Promise<void> {
    await this.page
      .getByRole('textbox', {
        name: this.textMock('schema_editor.create_model_description'),
      })
      .fill(name);
  }

  public async clickOnCreateModelButton(): Promise<void> {
    await this.page
      .getByRole('button', { name: this.textMock('schema_editor.create_model_confirm_button') })
      .click();
  }

  public async clickOnAddPropertyButton(): Promise<void> {
    await this.page
      .getByRole('button', { name: this.textMock('schema_editor.add') })
      .first()
      .click();
  }

  public async clickOnObjectAddPropertyButton(): Promise<void> {
    await this.page.getByTitle(this.textMock('schema_editor.add')).click();
  }

  public async clickOnAddObjectPropertyMenuItem(): Promise<void> {
    await this.page.getByRole('menuitem', { name: this.textMock('schema_editor.field') }).click();
  }

  public async clickOnCombinationPropertyMenuItem(): Promise<void> {
    await this.page
      .getByRole('menuitem', { name: this.textMock('schema_editor.combination') })
      .click();
  }

  public async checkThatTreeItemPropertyExistsOnScreen(name: string): Promise<void> {
    await this.page.getByRole('treeitem', { name }).isVisible();
  }

  public async clearNameField(): Promise<void> {
    await this.getNameField().clear();
  }

  public async typeNewNameInNameField(newName: string): Promise<void> {
    await this.getNameField().fill(newName);
  }

  public async tabOutOfNameField(): Promise<void> {
    await this.getNameField().blur();
  }

  public async getNameFieldValue(): Promise<string> {
    return await this.getNameField().inputValue();
  }

  public async clickOnTreeItemProperty(name: string): Promise<void> {
    await this.page.getByRole('treeitem', { name }).click();
  }

  public async focusOnTreeItemProperty(name: string): Promise<void> {
    await this.page.getByRole('treeitem', { name }).focus();
  }

  public async clickOnAddPropertyToObjectButton(propertyName: TextKey): Promise<void> {
    await this.page
      .getByRole('menuitem', {
        name: this.textMock(propertyName),
      })
      .click();
  }

  public async isTypeComboboxVisible(): Promise<boolean> {
    return this.getTypeCombobox().isVisible();
  }

  public async clickOnTypeCombobox(): Promise<void> {
    await this.getTypeCombobox().click();
  }

  public async getTypeComboboxValue(): Promise<string> {
    return this.getTypeCombobox().inputValue();
  }

  public async clickOnGenerateDataModelButton(): Promise<void> {
    await this.page
      .getByRole('button', { name: this.textMock('schema_editor.generate_model_files') })
      .click();
  }

  public async checkThatSuccessAlertIsVisibleOnScreen(): Promise<void> {
    const alert = this.page.getByText(
      this.textMock('schema_editor.data_model_generation_success_message'),
    );
    await expect(alert).toBeVisible();
  }

  public async checkThatDataModelOptionExists(option: string): Promise<void> {
    await this.page.getByRole('option', { name: option }).isVisible();
  }

  public async clickOnDeleteDataModelButton(): Promise<void> {
    await this.page
      .getByRole('button', { name: this.textMock('schema_editor.delete_data_model') })
      .click();
  }

  public async clickOnConfirmDeleteDataModelButton(): Promise<void> {
    await this.page
      .getByRole('button', { name: this.textMock('schema_editor.confirm_deletion') })
      .click();
  }

  public async checkThatDataModelOptionDoesNotExists(option: string): Promise<void> {
    await this.page.getByRole('option', { name: option }).isHidden();
  }

  public async selectFileToUpload(fileName: string): Promise<void> {
    await this.page
      .getByRole('toolbar')
      .getByTestId(DataTestId.FileSelectorInput)
      .setInputFiles(path.join(__dirname, fileName));
  }

  public async waitForDataModelToBeUploaded(): Promise<void> {
    const spinner = this.page.getByText(this.textMock('app_data_modelling.uploading_xsd'));
    await expect(spinner).toBeHidden();
  }

  public async getDataModelOptionValue(option: string): Promise<string> {
    return await this.page.getByRole('option', { name: option }).getAttribute('value');
  }

  public async waitForDataModelToAppear(dataModelName: string): Promise<void> {
    const dataModelButton = this.page.getByRole('button', { name: dataModelName, exact: true });
    await expect(dataModelButton).toBeVisible();
  }

  public async waitForSuccessAlertToDisappear(): Promise<void> {
    const successAlert = this.page.getByRole('alert', {
      name: this.textMock('schema_editor.data_model_generation_success_message'),
    });
    await expect(successAlert).toBeHidden();
  }

  // Helper function to get the name field
  private getNameField(): Locator {
    return this.page.getByRole('textbox', { name: this.textMock('schema_editor.name') });
  }

  // Helper function to get the type combobox
  private getTypeCombobox(): Locator {
    return this.page.getByRole('combobox', { name: this.textMock('schema_editor.type') });
  }
}
