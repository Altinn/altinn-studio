import { Routes } from './Routes';
import { Page } from '@playwright/test';

export class BasePage extends Routes {
  public readonly _page: Page;
  constructor(
    private page: Page,
    org?: string,
    app?: string,
  ) {
    super(org, app);
    this._page = this.page;
  }
}
