import { Page } from '@playwright/test';
import { RouterRoute } from './RouterRoute';
import { Environment } from './StudioEnvironment';

export class BasePage extends RouterRoute {
  public readonly page: Page;

  constructor(
    page: Page,
    environment?: Environment,
  ) {
    super(environment);
    this.page = page;
  }
}
