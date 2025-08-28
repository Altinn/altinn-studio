import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';

export class PreviewPage extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async loadPreviewPage(): Promise<void> {
    await this.page.goto(this.getRoute('preview'));
  }

  public async verifyPreviewPage(): Promise<void> {
    await this.page.waitForURL(this.getRoute('preview'));
  }
}
