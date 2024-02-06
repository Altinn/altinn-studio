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

  public async waitForXAmountOfMilliseconds(milliseconds: number): Promise<void> {
    await new Promise((resolve) =>
      setTimeout(() => {
        return resolve('');
      }, milliseconds),
    );
  }
}
