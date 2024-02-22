import type { LanguageCode } from '../enum/LanguageCode';
import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';

// Since this page is Gitea's page, it's not using the nb/en.json files, which are used in the frontend.
const giteaPageTexts: Record<string, string> = {
  app: 'App',
  ui: 'ui',
  layouts: 'layouts',
  dataModelBindings: 'dataModelBindings',
  config: 'config',
  texts: 'texts',
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
    await this.page.getByRole('link', { name: giteaPageTexts['ui'], exact: true }).click();
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

  public async clickOnLayoutJsonFile(pageName: string): Promise<void> {
    await this.page.getByRole('link', { name: `${pageName}.json` }).click();
  }

  public async verifyThatDataModelBindingsAreNotPresent(): Promise<void> {
    await this.page.getByText(giteaPageTexts['dataModelBindings']).isHidden();
  }

  public async verifyThatDataModelBindingsAreVisible(dataModelBindingName: string): Promise<void> {
    await this.page.getByText(giteaPageTexts['dataModelBindings']).isVisible();
    await this.page
      .getByText(`"simpleBinding": "${dataModelBindingName}"`, { exact: true })
      .isVisible();
  }

  public async verifyThatComponentIdIsVisible(id: string): Promise<void> {
    await this.page.getByText(`"id": "${id}"`).isVisible();
  }

  public async verifyThatTextResourceBindingsTitleIsVisible(title: string): Promise<void> {
    await this.page
      .getByText(`"textResourceBindings": { "title": "${title}" }`, { exact: true })
      .isVisible();
  }

  public async clickOnConfigFilesButton(): Promise<void> {
    await this.page.getByRole('link', { name: giteaPageTexts['config'] }).click();
  }

  public async clickOnTextFilesButton(): Promise<void> {
    await this.page.getByRole('link', { name: giteaPageTexts['texts'] }).click();
  }

  public async verifyThatResourceJsonFileIsVisible(lang: LanguageCode): Promise<void> {
    await this.page.getByRole('link', { name: `resource.${lang}.json`, exact: true }).isVisible();
  }

  public async clickOnResourceJsonFile(lang: LanguageCode): Promise<void> {
    await this.page.getByRole('link', { name: `resource.${lang}.json` }).click();
  }

  public async verifyLanguageFile(lang: LanguageCode): Promise<void> {
    await this.page.getByText(`"language": "${lang}"`, { exact: true }).isVisible();
  }

  public async verifyTextIdAndValue(id: string, value: string): Promise<void> {
    await this.page.getByText(`"id": "${id}", "value": "${value}"`, { exact: true }).isVisible();
  }
}
