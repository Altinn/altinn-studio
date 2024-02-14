import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Locator, Page } from '@playwright/test';
import * as testids from '../../testids';
import type { ComponentType } from '../enum/ComponentType';
import type { DragAndDropComponents } from '../types/DragAndDropComponents';
import { UxEditorEditSettings } from '../enum/UxEditorEditSettings';

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

  // Empty list
  public async dragComponentInToDroppableList(component: ComponentType): Promise<void> {
    const dropDestination = this.getDroppableList();

    await this.getToolbarItems()
      .getByText(this.textMock(`ux_editor.component_title.${component}`))
      .dragTo(dropDestination);
  }

  public async dragComponentInToDroppableListItem(
    components: DragAndDropComponents,
  ): Promise<void> {
    const { componentToDrag, componentToDropOn } = components;

    await this.hoverOverComponentToDrag(componentToDrag);
    await this.startDragComponent();

    // Dragging manually requires the hover over the droppable list treeitem to be called at least 2 times: https://playwright.dev/docs/input#dragging-manually
    const numberOfTimesToHoverOverDroppableListTreeItem: number = 3;

    for (let i = 0; i < numberOfTimesToHoverOverDroppableListTreeItem; i++) {
      await this.hoverOverDroppableListTreeItem(componentToDropOn);
    }

    await this.dropComponent();
  }

  public async verifyThatComponentTreeItemIsVisibleInDroppableList(
    component: ComponentType,
  ): Promise<void> {
    await this.page
      .getByRole('treeitem', {
        name: this.textMock(`ux_editor.component_title.${component}`),
      })
      .isVisible();
  }

  public async clickOnDeleteInputComponentButton(): Promise<void> {
    await this.getDroppableList()
      .getByRole('button', { name: this.textMock('general.delete') })
      .click();
  }

  public async verifyThatNewPageIsHidden(pageName: string): Promise<void> {
    await this.page.getByRole('button', { name: pageName, exact: true }).isHidden();
  }

  public async clickOnAddNewPage(): Promise<void> {
    await this.page.getByRole('button', { name: this.textMock('ux_editor.pages_add') }).click();
  }

  public async verifyThatNewPageIsVisible(pageName: string): Promise<void> {
    await this.page.getByRole('heading', { name: pageName, level: 3, exact: true }).isVisible();
  }

  public async verifyThatPageEmptyMessageIsHidden(): Promise<void> {
    await this.page.getByText(this.textMock('ux_editor.container_empty')).isHidden();
  }

  public async verifyThatNavigationButtonsAreAddedToPage(): Promise<void> {
    await this.page
      .getByRole('treeitem', {
        name: this.textMock('ux_editor.component_title.NavigationButtons'),
      })
      .isVisible();
  }

  public async openTextComponentSection(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('ux_editor.collapsable_text_components'),
      })
      .click();
  }

  public async getBetaConfigSwitchValue(): Promise<boolean> {
    return await this.page
      .getByRole('checkbox', {
        name: this.textMock('ux_editor.edit_component.show_beta_func'),
      })
      .isChecked();
  }

  public async clickOnTurnOnBetaConfigSwitch(): Promise<void> {
    await this.page
      .getByRole('checkbox', {
        name: this.textMock('ux_editor.edit_component.show_beta_func'),
      })
      .click();
  }

  public async clickOnAddLabelText(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('ux_editor.text_resource_binding_add', {
          element: this.textMock(
            `ux_editor.modal_properties_textResourceBindings_${UxEditorEditSettings.Title}`,
          ),
        }),
      })
      .click();
  }

  public async writeLabelTextInTextarea(text: string): Promise<void> {
    await this.page
      .getByRole('textbox', {
        name: this.textMock('language.nb'),
      })
      .fill(text);
  }

  public async clickOnSaveNewLabelName(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('general.close'),
      })
      .click();
  }

  public async verifyThatTreeItemByNameIsNotVisibleInDroppableList(name: string): Promise<void> {
    await this.page.getByRole('treeitem', { name }).isHidden();
  }

  public async verifyThatTreeItemByNameIsVisibleInDroppableList(name: string): Promise<void> {
    await this.page.getByRole('treeitem', { name }).isVisible();
  }

  public async clickOnAddDataModelButton(): Promise<void> {
    await this.page
      .getByRole('button', { name: this.textMock('ux_editor.modal_properties_data_model_link') })
      .click();
  }

  public async clickOnTreeItem(name: string): Promise<void> {
    await this.page.getByRole('treeitem', { name }).click();
  }

  public async clickOnTreeItemByComponentType(component: ComponentType): Promise<void> {
    await this.page
      .getByRole('treeitem', {
        name: this.textMock(`ux_editor.component_title.${component}`),
      })
      .click();
  }

  public async clickOnDataModelBindingsCombobox(): Promise<void> {
    await this.page
      .getByRole('combobox', {
        name: this.textMock('ux_editor.modal_properties_data_model_helper'),
      })
      .click();
  }

  public async verifyThatThereAreNoOptionsInTheDataModelList(): Promise<void> {
    await this.page
      .getByRole('combobox', {
        name: this.textMock('ux_editor.modal_properties_data_model_helper'),
      })
      .getByRole('option')
      .isHidden();
  }

  public async verifyThatThereAreOptionsInTheDataModelList(): Promise<void> {
    await this.page
      .getByRole('combobox', {
        name: this.textMock('ux_editor.modal_properties_data_model_helper'),
      })
      .getByRole('option')
      .isVisible();
  }

  public async clickOnDataModelPropertyOption(option: string): Promise<void> {
    await this.page.getByRole('option', { name: option }).click();
  }

  public async clickOnSaveDataModel(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('ux_editor.input_popover_save_button'),
      })
      .click();
  }

  private getToolbarItems(): Locator {
    return this.page.getByTestId(testids.draggableToolbarItem);
  }

  private getDroppableList(): Locator {
    return this.page.getByTestId(testids.droppableList);
  }

  private async hoverOverComponentToDrag(componentToDrag: ComponentType): Promise<void> {
    await this.page
      .getByTestId(testids.draggableToolbarItem)
      .getByText(this.textMock(`ux_editor.component_title.${componentToDrag}`))
      .hover();
  }

  private async startDragComponent(): Promise<void> {
    await this.page.mouse.down();
  }

  private async hoverOverDroppableListTreeItem(componentToDropOn: ComponentType): Promise<void> {
    await this.page
      .getByTestId(testids.droppableList)
      .getByRole('treeitem', {
        name: this.textMock(`ux_editor.component_title.${componentToDropOn}`),
      })
      .hover();
  }

  private async dropComponent(): Promise<void> {
    await this.page.mouse.up();
  }
}
