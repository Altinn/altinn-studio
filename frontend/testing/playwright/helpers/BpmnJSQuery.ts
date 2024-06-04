import type { Page } from '@playwright/test';

export class BpmnJSQuery {
  public readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Gets the BPMN element by its 'data-element-id'
   */
  public async getTaskById(dataElementId: string): Promise<string> {
    const elementSelector = `g[data-element-id="${dataElementId}"]`;
    await this.page.waitForSelector(elementSelector);
    return elementSelector;
  }
}
