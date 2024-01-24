import * as nbTexts from '@altinn-studio/language/src/nb.json';
import * as enTexts from '@altinn-studio/language/src/en.json';
import type { Locator, Page } from '@playwright/test';
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

  // Helper function to get a button by the text key
  protected getButtonByTextKey(key: TextKey): Locator {
    return this.page.getByRole('button', { name: this.textMock(key) });
  }

  // Helper function to get a menu item by the text key
  protected getMenuItemByTextKey(key: TextKey, params?: TextMockParams): Locator {
    return this.page.getByRole('menuitem', { name: this.textMock(key, params), exact: true });
  }

  // Helper function to get a menu item by the name
  protected getMenuItemByName(name: string): Locator {
    return this.page.getByRole('menuitem', { name });
  }

  // Helper function to get a tree item property by the name
  protected getTreeItemPropertyByName(name: string): Locator {
    return this.page.getByRole('treeitem', { name });
  }

  // Helper function to get a combobox by the text key
  protected getComboboxByTextKey(key: TextKey): Locator {
    return this.page.getByRole('combobox', { name: this.textMock(key) });
  }

  // Helper function to get a textbox by the text key
  protected getTextboxByTextKey(key: TextKey): Locator {
    return this.page.getByRole('textbox', { name: this.textMock(key) });
  }

  // Helper function to get an option by the text key
  protected getOptionByTextKey(key: TextKey): Locator {
    return this.page.getByRole('option', { name: this.textMock(key) });
  }

  // Helper function to get an alert by the text key
  protected getAlertByTextKey(key: TextKey): Locator {
    return this.page.getByRole('alert', { name: this.textMock(key) });
  }

  // Helper function to get an option by the text key
  protected getOptionByName(name: string): Locator {
    return this.page.getByRole('option', { name });
  }

  // Helper function to get a link by the text key
  protected getLinkByTextKey(key: TextKey): Locator {
    return this.page.getByRole('link', { name: this.textMock(key) });
  }

  // Helper function to get a heading by the text key and level
  protected getHeadingByTextKeyAndLevel(
    key: TextKey,
    level: number,
    textKeyParams?: TextMockParams,
  ): Locator {
    return this.page.getByRole('heading', { name: this.textMock(key, textKeyParams), level });
  }
}
