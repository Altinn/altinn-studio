import { BasePage, TextKey } from '../helpers/BasePage';
import { Locator, Page } from '@playwright/test';
import { Environment } from '../helpers/StudioEnvironment';
import * as testids from '../../testids';
import path from 'path';

export class DataModelPage extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async loadDataModelPage(): Promise<void> {
    await this.page.goto(this.getRoute('editorDatamodel'));
  }

  public async verifyDataModelPage(): Promise<void> {
    await this.page.waitForURL(this.getRoute('editorDatamodel'));
  }

  public async clickOnCreateNewDataModelButton(): Promise<void> {
    await this.getButtonByTextKey('app_data_modelling.landing_dialog_create').click();
  }

  public async typeDataModelName(name: string): Promise<void> {
    await this.getTextboxByTextKey('schema_editor.create_model_description').fill(name);
  }

  public async clickOnCreateModelButton(): Promise<void> {
    await this.getButtonByTextKey('schema_editor.create_model_confirm_button').click();
  }

  public async clickOnAddPropertyButton(): Promise<void> {
    await this.getButtonByTextKey('schema_editor.add').click();
  }

  public async clickOnAddObjectPropertyMenuItem(): Promise<void> {
    await this.getMenuItemByTextKey('schema_editor.field').click();
  }

  public async checkThatTreeItemProperyExistsOnScreen(name: string): Promise<void> {
    await this.getTreeItemPropertyByName(name).isVisible();
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
    await this.getTreeItemPropertyByName(name).click();
  }

  public async focusOnTreeItemProperty(name: string): Promise<void> {
    await this.getTreeItemPropertyByName(name).focus();
  }

  public async clickOnAddNodeToPropertyButton(): Promise<void> {
    await this.getButtonByTextKey('schema_editor.add_node_of_type').click();
  }

  public async clickOnAddFieldToNodeButton(): Promise<void> {
    await this.getMenuItemByTextKey('schema_editor.add_field').click();
  }

  public async clickOnTypeCombobox(): Promise<void> {
    await this.getTypeCombobox().click();
  }

  public async getTypeComboboxValue(): Promise<string> {
    return this.getTypeCombobox().inputValue();
  }

  public getTypeComboboxOption(type: 'text' | 'integer'): string {
    switch (type) {
      case 'text':
        return this.textMock('schema_editor.description');
      case 'integer':
        return this.textMock('schema_editor.integer');
    }
  }

  public async clickOnIntegerOption(): Promise<void> {
    await this.getOptionByTextKey('schema_editor.integer').click();
  }

  public async clickOnGenerateDataModelButton(): Promise<void> {
    await this.getButtonByTextKey('schema_editor.generate_model_files').click();
  }

  public async checkThatSuccessAlertIsVisibleOnScreen(): Promise<void> {
    await this.getAlertByTextKey('schema_editor.datamodel_generation_success_message').isVisible();
  }

  public async checkThatDataModelOptionExists(option: string): Promise<void> {
    await this.getDataModelOptionByName(option).isVisible();
  }

  public async clickOnDeleteDataModelButton(): Promise<void> {
    await this.getButtonByTextKey('schema_editor.delete_data_model').click();
  }

  public async clickOnConfirmDeleteDataModelButton(): Promise<void> {
    await this.getButtonByTextKey('schema_editor.confirm_deletion').click();
  }

  public async checkThatDataModelOptionDoesNotExists(option: string): Promise<void> {
    await this.getDataModelOptionByName(option).isHidden();
  }

  public async selectFileToUpload(fileName: string): Promise<void> {
    await this.page
      .getByTestId(testids.fileSelectorInput)
      .first()
      .setInputFiles(path.join(__dirname, fileName));
  }

  public async getDataModelOptionValue(option: string): Promise<string> {
    return await this.getDataModelOptionByName(option).getAttribute('value');
  }

  // Helper function to get a button by the text key
  private getButtonByTextKey(key: TextKey): Locator {
    return this.page.getByRole('button', { name: this.textMock(key) });
  }

  // Helper function to get a menu item by the text key
  private getMenuItemByTextKey(key: TextKey): Locator {
    return this.page.getByRole('menuitem', { name: this.textMock(key) });
  }

  // Helper function to get a tree item property by the name
  private getTreeItemPropertyByName(name: string): Locator {
    return this.page.getByRole('treeitem', { name });
  }

  // Helper function to get a combox by the text key
  private getComboboxByTextKey(key: TextKey): Locator {
    return this.page.getByRole('combobox', { name: this.textMock(key) });
  }

  // Helper function to get a textbox by the text key
  private getTextboxByTextKey(key: TextKey): Locator {
    return this.page.getByRole('textbox', { name: this.textMock(key) });
  }

  // Helper function to get an option by the text key
  private getOptionByTextKey(key: TextKey): Locator {
    return this.page.getByRole('option', { name: this.textMock(key) });
  }

  // Helper function to get an alert by the text key
  private getAlertByTextKey(key: TextKey): Locator {
    return this.page.getByRole('alert', { name: this.textMock(key) });
  }

  // Helper function to get the name field
  private getNameField(): Locator {
    return this.getTextboxByTextKey('schema_editor.name');
  }

  // Helper function to get the type combobox
  private getTypeCombobox(): Locator {
    return this.getComboboxByTextKey('schema_editor.type');
  }

  // Helper function to get an option by the text key
  private getDataModelOptionByName(name: string): Locator {
    return this.page.getByRole('option', { name });
  }
}
