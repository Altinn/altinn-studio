import * as nbTexts from 'language/src/nb.json';
import * as enTexts from 'language/src/en.json';
import type { Locator, Page } from '@playwright/test';
import { RouterRoute } from './RouterRoute';
import type { Environment } from './StudioEnvironment';

type Locale = 'nb' | 'en';
export type TextKey = keyof typeof nbTexts | keyof typeof enTexts;

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

  // Use this in favor of Playwright's dragTo method when the exact element that is supposed to listen to the drop event is unknown (i.e. if it may be a child element of the target)
  public async dragAndDropManually(source: Locator, target: Locator): Promise<void> {
    await source.hover();
    await this.page.mouse.down();
    const numberOfTimesToHover: number = 5; // Target must be hovered multiple times - see https://playwright.dev/docs/input#dragging-manually
    for (let i = 0; i < numberOfTimesToHover; i++) await target.hover();
    await this.page.mouse.up();
  }
}
