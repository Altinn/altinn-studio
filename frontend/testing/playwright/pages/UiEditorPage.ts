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

  public async verifyUiEditorPage(layout?: string | null): Promise<void> {
    const baseRoute = this.getRoute('editorUi');
    if (layout === null || typeof layout === 'string') {
      const layoutString = `?layout=${layout}`;
      await this.page.waitForURL(`${baseRoute}${layoutString}`);
    } else {
      await this.page.waitForURL(baseRoute);
    }
  }
}
