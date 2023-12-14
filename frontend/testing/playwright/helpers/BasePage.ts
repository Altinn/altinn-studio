import { Routes } from './Routes';
import { Page } from '@playwright/test';
import { RouterRoute } from './RouterRoute';
import { Environment } from './StudioEnvironment';

export class BasePage extends RouterRoute {
  public readonly _page: Page;

  constructor(
    private page: Page,
    private environment: Environment,
  ) {
    super(environment);
    this._page = this.page;
  }
}
