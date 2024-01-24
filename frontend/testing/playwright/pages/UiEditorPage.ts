import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';

export class UiEditorPage extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async loadUiEditorPage(): Promise<void> {
    await this.page.goto(this.getRoute('editorUi'));
  }

  public async verifyUiEditorPage(): Promise<void> {
    await this.page.waitForURL(this.getRoute('editorUi'));
  }
}
