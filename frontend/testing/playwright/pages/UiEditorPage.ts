import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { ComponentType } from '../enum/ComponentType';
import type { DragAndDropComponents } from '../types/DragAndDropComponents';
import { expect, type Locator, type Page } from '@playwright/test';
import { DataTestId } from '../enum/DataTestId';
import type { LanguageCode } from '../enum/LanguageCode';

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

  // This is for when the list is empty
  public async dragComponentInToDroppableList(component: ComponentType): Promise<void> {
    const dropDestination = this.getDroppableList();

    await this.getToolbarItems()
      .getByText(this.textMock(`ux_editor.component_title.${component}`))
      .dragTo(dropDestination);
  }

  // This is for when the list is is not empty
  public async dragComponentInToDroppableListItem(
    components: DragAndDropComponents,
  ): Promise<void> {
    const { componentToDrag, componentToDropOn } = components;

    await this.hoverOverComponentToDrag(componentToDrag);
    await this.startDragComponent();

    // Dragging manually requires the hover over the droppable list treeitem to be called at least 2 times: https://playwright.dev/docs/input#dragging-manually
    const numberOfTimesToHoverOverDroppableListTreeItem: number = 5;

    for (let i = 0; i < numberOfTimesToHoverOverDroppableListTreeItem; i++) {
      await this.hoverOverDroppableListTreeItem(componentToDropOn);
    }

    await this.dropComponent();
  }

  public async waitForComponentTreeItemToBeVisibleInDroppableList(
    component: ComponentType,
  ): Promise<void> {
    const treeItem = this.getDroppableList().getByRole('treeitem', {
      name: this.textMock(`ux_editor.component_title.${component}`),
    });

    await expect(treeItem).toBeVisible();
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

  public async waitForDraggableToolbarItemToBeVisible(component: ComponentType): Promise<void> {
    const textTreeItem = this.page
      .getByTestId(DataTestId.DraggableToolbarItem)
      .getByText(this.textMock(`ux_editor.component_title.${component}`));

    await expect(textTreeItem).toBeVisible();
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
        name: this.textMock('ux_editor.text_resource_binding_add_title'),
      })
      .click();
  }

  public async clickOnEditLabelText(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('ux_editor.text_resource_binding_edit_title'),
      })
      .click();
  }

  public async writeLabelTextInTextarea(text: string): Promise<void> {
    await this.page.getByLabel(this.textMock('language.nb')).fill(text);
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
    await this.page.getByRole('listbox').getByRole('option', { name: option }).click();
  }

  public async clickOnSaveDataModel(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('ux_editor.input_popover_save_button'),
      })
      .click();
  }

  public async waitForDataModelToBeSelected(): Promise<void> {
    const saveButton = this.page.getByRole('button', {
      name: this.textMock('ux_editor.input_popover_save_button'),
    });

    await expect(saveButton).toBeHidden();
  }

  public async waitForTreeItemToGetNewLabel(label: string): Promise<void> {
    const newTreeItemLabel = this.page.getByRole('treeitem', { name: label });
    await expect(newTreeItemLabel).toBeVisible();
  }

  public async deleteOldComponentId(): Promise<void> {
    await this.page
      .getByLabel(this.textMock('ux_editor.modal_properties_component_change_id'))
      .clear();
  }

  public async writeNewComponentId(newId: string): Promise<void> {
    await this.page
      .getByLabel(this.textMock('ux_editor.modal_properties_component_change_id'))
      .fill(newId);
  }

  public async verifyThatTextKeyIsVisible(textKey: string): Promise<void> {
    await this.page.getByText(this.textMock('ux_editor.field_id', { id: textKey })).isVisible();
  }

  public async verifyThatTextKeyIsHidden(textKey: string): Promise<void> {
    await this.page.getByText(this.textMock('ux_editor.field_id', { id: textKey })).isHidden();
  }

  public async verifyThatTextareaIsVisible(lang: LanguageCode): Promise<void> {
    await this.page.getByRole('textbox', { name: this.textMock(`language.${lang}`) }).isVisible();
  }

  private getToolbarItems(): Locator {
    return this.page.getByTestId(DataTestId.DraggableToolbarItem);
  }

  private getDroppableList(): Locator {
    return this.page.getByTestId(DataTestId.DroppableList);
  }

  private async hoverOverComponentToDrag(componentToDrag: ComponentType): Promise<void> {
    await this.page
      .getByTestId(DataTestId.DraggableToolbarItem)
      .getByText(this.textMock(`ux_editor.component_title.${componentToDrag}`))
      .hover();
  }

  private async startDragComponent(): Promise<void> {
    await this.page.mouse.down();
  }

  private async hoverOverDroppableListTreeItem(componentToDropOn: ComponentType): Promise<void> {
    await this.page
      .getByRole('treeitem', {
        name: this.textMock(`ux_editor.component_title.${componentToDropOn}`),
      })
      .hover();
  }

  private async dropComponent(): Promise<void> {
    await this.page.mouse.up();
  }
}
