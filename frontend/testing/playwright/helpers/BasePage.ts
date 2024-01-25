import * as nbTexts from '@altinn-studio/language/src/nb.json';
import * as enTexts from '@altinn-studio/language/src/en.json';
import type { Page } from '@playwright/test';
import { RouterRoute } from './RouterRoute';
import type { Environment } from './StudioEnvironment';

type Locale = 'nb' | 'en';
type TextKey = keyof typeof nbTexts | keyof typeof enTexts;

const localeTextMap: Record<Locale, typeof nbTexts | typeof enTexts> = {
  nb: nbTexts,
  en: enTexts,
};

type TextMockParams = Record<string, string>;

type TopMenuNames =
  | 'about'
  | 'create'
  | 'dashboard'
  | 'datamodel'
  | 'deploy'
  | 'preview'
  | 'preview_back_to_editing'
  | 'process-editor'
  | 'texts';

export class BasePage extends RouterRoute {
  public readonly page: Page;

  constructor(page: Page, environment?: Environment) {
    super(environment);
    this.page = page;
  }

  public textMock(key: TextKey, params?: TextMockParams, locale: Locale = 'nb'): string {
    let text = localeTextMap[locale][key] || key;

    if (params) {
      Object.keys(params).forEach((paramKey) => {
        const paramValue = params[paramKey];
        text = text.replace(`{{${paramKey}}}`, paramValue);
      });
    }

    return text;
  }

  public async clickOnNavigateToPageInTopMenuHeader(page: TopMenuNames): Promise<void> {
    await this.page
      .getByRole('link', { name: this.textMock(`top_menu.${page}`), exact: true })
      .first()
      .click();
  }

  public async clickOnNavigateBackToDashboard(): Promise<void> {
    await this.page.getByRole('link');
  }
}
