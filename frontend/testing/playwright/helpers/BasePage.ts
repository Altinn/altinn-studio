import * as nbTexts from '@altinn-studio/language/src/nb.json';
import * as enTexts from '@altinn-studio/language/src/en.json';
import { Locator, Page } from '@playwright/test';
import { RouterRoute } from './RouterRoute';
import { Environment } from './StudioEnvironment';

type Locale = 'nb' | 'en';
type TextKey = keyof typeof nbTexts | keyof typeof enTexts;

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

  // Helper function to get a button by the text key
  protected getButtonByTextKey(key: TextKey): Locator {
    return this.page.getByRole('button', { name: this.textMock(key) });
  }

  // Helper function to get a menu item by the text key
  protected getMenuItemByTextKey(key: TextKey): Locator {
    return this.page.getByRole('menuitem', { name: this.textMock(key) });
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
}
