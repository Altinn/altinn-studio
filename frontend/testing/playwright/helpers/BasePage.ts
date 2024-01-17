import * as nbTexts from '@altinn-studio/language/src/nb.json';
import * as enTexts from '@altinn-studio/language/src/en.json';
import { Page } from '@playwright/test';
import { RouterRoute } from './RouterRoute';
import { Environment } from './StudioEnvironment';

type Locale = 'nb' | 'en';
export type TextKey = keyof typeof nbTexts | keyof typeof enTexts;

const localeTextMap: Record<Locale, typeof nbTexts | typeof enTexts> = {
  nb: nbTexts,
  en: enTexts,
};

export class BasePage extends RouterRoute {
  public readonly page: Page;

  constructor(page: Page, environment?: Environment) {
    super(environment);
    this.page = page;
  }

  public textMock(key: TextKey, locale: Locale = 'nb'): string {
    return localeTextMap[locale][key] || key;
  }
}
