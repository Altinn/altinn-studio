import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Locator, Page } from '@playwright/test';
import * as testids from '../../testids';

export class UiEditorPage extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async loadUiEditorPage(): Promise<void> {
    await this.page.goto(this.getRoute('editorUi'));
  }

  public async verifyUiEditorPage(layout?: string | null): Promise<void> {
    const baseRoute = this.getRoute('editorUi');
    if (layout === null || typeof layout === 'string') {
      const layoutString = `?layout=${layout}`;
      await this.page.waitForURL(`${baseRoute}${layoutString}`);
    } else {
      await this.page.waitForURL(baseRoute);
    }
  }

  public async clickOnPageAccordion(pageName: string): Promise<void> {
    await this.page.getByRole('button', { name: pageName, exact: true }).click();
  }

  public async verifyThatPageIsEmpty(): Promise<void> {
    await this.page.getByText(this.textMock('ux_editor.container_empty')).isVisible();
  }

  public async dragTitleInputComponentInToDroppableList(): Promise<void> {
    const dropDestination = this.getDroppableList();
    await this.getToolbarItems()
      .getByText(this.textMock('ux_editor.component_title.Input'))
      .dragTo(dropDestination);
  }

  public async verifyThatInputComponentTreeItemIsVisibleInDroppableList(): Promise<void> {
    await this.page
      .getByRole('treeitem', {
        name: this.textMock('ux_editor.component_title.Input'),
      })
      .isVisible();
  }

  public async clickOnDeleteInputComponentButton(): Promise<void> {
    await this.getDroppableList()
      .getByRole('button', { name: this.textMock('general.delete') })
      .click();
  }

  public async verifyThatPageEmptyMessageIsGone(): Promise<void> {
    await this.page.getByText(this.textMock('ux_editor.container_empty')).isHidden();
  }

  private getToolbarItems(): Locator {
    return this.page.getByTestId(testids.draggableToolbarItem);
  }

  private getDroppableList(): Locator {
    return this.page.getByTestId(testids.droppableList);
  }
}
