import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';

export class TextEditorPage extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async loadTextEditorPage(): Promise<void> {
    await this.page.goto(this.getRoute('editorText'));
  }

  public async verifyTextEditorPage(): Promise<void> {
    await this.page.waitForURL(this.getRoute('editorText'));
  }
}
