import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';

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
}
