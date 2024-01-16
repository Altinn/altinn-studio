import { BasePage } from '../helpers/BasePage';
import { Locator, Page } from '@playwright/test';
import { Environment } from '../helpers/StudioEnvironment';

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
    await this.page
      .getByRole('button', { name: this.textMock('app_data_modelling.landing_dialog_create') })
      .click();
  }

  public async addDataModelName(): Promise<void> {
    await this.page
      .getByRole('textbox', { name: this.textMock('schema_editor.create_model_description') })
      .fill('datamodel');
  }

  public async clickOnCreateModelButton(): Promise<void> {
    await this.page
      .getByRole('button', { name: this.textMock('schema_editor.create_model_confirm_button') })
      .click();
  }

  public async clickOnAddPropertyButton(): Promise<void> {
    await this.page.getByRole('button', { name: this.textMock('schema_editor.add') }).click();
  }

  public async clickOnAddObjectPropertyMenuItem(): Promise<void> {
    await this.page.getByRole('menuitem', { name: this.textMock('schema_editor.field') }).click();
  }

  public async checkThatName0Exists(): Promise<void> {
    await this.getTreeItemPropertyByName('name0').isVisible();
  }

  private getTreeItemPropertyByName(name: string): Locator {
    return this.page.getByRole('treeitem', { name });
  }
}
