import type { Page } from '@playwright/test';

type SvgElement = 'svg' | 'g';

export class BpmnJSQuery {
  public readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Gets the BPMN element by its 'data-element-id'
   */
  public async getTaskByIdAndType(id: string, type: SvgElement): Promise<string> {
    const elementSelector = `${type}[data-element-id="${id}"]`;
    return elementSelector;
  }
}
