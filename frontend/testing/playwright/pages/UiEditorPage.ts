import { BasePage, type TextKey } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Locator, Page } from '@playwright/test';
import type { ComponentType } from '../enum/ComponentType';
import type { DragAndDropComponents } from '../types/DragAndDropComponents';
import { expect } from '@playwright/test';
import { DataTestId } from '../enum/DataTestId';
import type { LanguageCode } from '../enum/LanguageCode';

const dataModelBindingButtonTextMap: Record<string, TextKey> = {
  Input: 'ux_editor.component_title.Input',
};

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

  public async clickOnComponentTextConfigAccordion(): Promise<void> {
    await this.page
      .getByLabel(this.textMock('right_menu.text_label'))
      .getByRole('button', { name: this.textMock('right_menu.text') })
      .click();
  }

  public async clickOnComponentDataModelBindingConfigAccordion(): Promise<void> {
    await this.page
      .getByRole('button', { name: this.textMock('right_menu.data_model_bindings') })
      .click();
  }

  public async verifyThatPageIsEmpty(): Promise<void> {
    await this.page.getByText(this.textMock('ux_editor.container_empty')).isVisible();
  }

  public async dragComponentIntoDroppableListItem(
    components: DragAndDropComponents,
  ): Promise<void> {
    const { componentToDrag, componentToDropOn } = components;
    const dragLocator = await this.getDraggableComponent(componentToDrag);
    const dropLocator = await this.getComponentInListByType(componentToDropOn);
    await this.dragAndDropManually(dragLocator, dropLocator);
  }

  public async dragComponentIntoDroppableList(component: ComponentType): Promise<void> {
    const dropDestination = this.getDroppableList();
    const componentToDrag = await this.getDraggableComponent(component);
    await this.dragAndDropManually(componentToDrag, dropDestination);
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
    await this.page.getByRole('button', { name: pageName, exact: true }).isVisible();
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
      .getByRole('heading', { level: 3 })
      .getByRole('button', {
        name: this.textMock('ux_editor.collapsable_text_components'),
      })
      .click();
  }

  public async waitForDraggableToolbarItemToBeVisible(component: ComponentType): Promise<void> {
    const textTreeItem = this.page
      .getByTestId(DataTestId.DraggableToolbarItem as string)
      .getByText(this.textMock(`ux_editor.component_title.${component}`));

    await expect(textTreeItem).toBeVisible();
  }

  public async clickOnTitleTextButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('ux_editor.modal_properties_textResourceBindings_title'),
        exact: true,
      })
      .click();
  }

  public async writeTitleTextInTextarea(text: string): Promise<void> {
    await this.getTitleTextFieldset()
      .getByRole('textbox', { name: this.textMock('ux_editor.text_resource_binding_text') })
      .fill(text);
  }

  private getTitleTextFieldset(): Locator {
    return this.page.getByRole('group', {
      name: this.textMock('ux_editor.modal_properties_textResourceBindings_title'),
    });
  }

  public async clickOnSaveNewLabelName(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('general.close'),
        exact: true,
      })
      .click();
  }

  public async verifyThatTreeItemByNameIsNotVisibleInDroppableList(name: string): Promise<void> {
    await this.page.getByRole('treeitem', { name }).isHidden();
  }

  public async verifyThatTreeItemByNameIsVisibleInDroppableList(name: string): Promise<void> {
    await this.page.getByRole('treeitem', { name }).isVisible();
  }

  public async clickOnAddDataModelButton(componentType: ComponentType): Promise<void> {
    await this.page
      .getByRole('button', { name: this.textMock(dataModelBindingButtonTextMap[componentType]) })
      .click();
  }

  public async clickOnTreeItem(name: string): Promise<void> {
    await this.page.getByRole('treeitem', { name }).click();
  }

  public async clickOnDataModelBindingCombobox(): Promise<void> {
    await this.page
      .getByRole('combobox', {
        name: this.textMock('ux_editor.modal_properties_data_model_binding'),
        exact: true,
      })
      .click();
  }

  public async clickOnDataModelFieldBindingCombobox(): Promise<void> {
    await this.page
      .getByRole('combobox', {
        name: this.textMock('ux_editor.modal_properties_data_model_field_binding'),
      })
      .click();
  }

  public async verifyThatThereAreOptionsInTheDataModelFieldList(): Promise<void> {
    const options = this.page
      .getByRole('combobox', {
        name: this.textMock('ux_editor.modal_properties_data_model_field_binding'),
      })
      .locator('option');
    await expect(options).toHaveCount(4);
  }

  public async clickOnDataModelFieldPropertyOption(option: string): Promise<void> {
    await this.page
      .getByRole('combobox', {
        name: this.textMock('ux_editor.modal_properties_data_model_field_binding'),
      })
      .selectOption(option);
  }

  public async clickOnDataModelPropertyOption(option: string): Promise<void> {
    await this.page
      .getByLabel(this.textMock('ux_editor.modal_properties_data_model_binding'), { exact: true })
      .selectOption(option);
  }

  public async clickOnSaveDataModel(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('general.close'),
        exact: true,
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
      .getByRole('button', {
        name: this.textMock('ux_editor.modal_properties_component_change_id'),
      })
      .click();
    await this.page
      .getByLabel(this.textMock('ux_editor.modal_properties_component_change_id'))
      .clear();
  }

  public async writeNewComponentId(newId: string): Promise<void> {
    await this.page
      .getByLabel(this.textMock('ux_editor.modal_properties_component_change_id'))
      .fill(newId);

    await this.page
      .getByLabel(this.textMock('ux_editor.modal_properties_component_change_id'))
      .blur();
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

  public async clickOnUxEditorButton(): Promise<void> {
    await this.page
      .getByRole('button', { name: this.textMock('ux_editor.task_card.ux_editor') })
      .click();
  }

  public async verifyThatAddNewPageButtonIsVisible(): Promise<void> {
    const addButton = this.page.getByRole('button', { name: this.textMock('ux_editor.pages_add') });
    await expect(addButton).toBeVisible();
  }

  private getDroppableList(): Locator {
    return this.page.getByTestId(DataTestId.DroppableList as string);
  }

  private async getDraggableComponent(componentToDrag: ComponentType): Promise<Locator> {
    return this.page
      .getByTestId(DataTestId.DraggableToolbarItem as string)
      .getByText(this.textMock(`ux_editor.component_title.${componentToDrag}`));
  }

  private async getComponentInListByType(componentType: ComponentType): Promise<Locator> {
    return this.page.getByRole('treeitem', {
      name: this.textMock(`ux_editor.component_title.${componentType}`),
    });
  }
}
