import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';

// Since this page is Gitea's page, it's not using the nb/en.json files, which are used in the frontend.
const giteaPageTexts: Record<string, string> = {
  app: 'App',
  ui: 'ui',
  layouts: 'layouts',
};

export class GiteaPage extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async loadGiteaPage(): Promise<void> {
    await this.page.goto(this.getRoute('gitea'));
  }

  public async verifyGiteaPage(): Promise<void> {
    await this.page.waitForURL(this.getRoute('gitea'));
  }

  public async clickOnAppFilesButton(): Promise<void> {
    await this.page.getByRole('link', { name: giteaPageTexts['app'], exact: true }).click();
  }

  public async clickOnUiFilesButton(): Promise<void> {
    await this.page.getByRole('link', { name: giteaPageTexts['ui'] }).click();
  }

  public async clickOnLayoutsFilesButton(): Promise<void> {
    await this.page.getByRole('link', { name: giteaPageTexts['layouts'] }).click();
  }

  public async verifyThatTheNewPageIsNotPresent(pageName: string): Promise<void> {
    await this.page.getByRole('link', { name: `${pageName}.json` }).isHidden();
  }

  public async verifyThatTheNewPageIsPresent(pageName: string): Promise<void> {
    await this.page.getByRole('link', { name: `${pageName}.json` }).isVisible();
  }

  public async goBackNPages(nPages: number): Promise<void> {
    for (let i = 0; i < nPages; i++) {
      await this.page.goBack();
    }
  }
}
