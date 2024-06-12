import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { type BpmnTaskType } from '../types/BpmnTaskType';

const connectionArrowText: string = 'Connect using Sequence/MessageFlow or Association';

export class ProcessEditorPage extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async loadProcessEditorPage(): Promise<void> {
    await this.page.goto(this.getRoute('editorProcess'));
  }

  public async verifyProcessEditorPage(): Promise<void> {
    await this.page.waitForURL(this.getRoute('editorProcess'));
  }

  public async clickOnTaskInBpmnEditor(elementSelector: string): Promise<void> {
    await this.page.click(elementSelector);
  }

  public async waitForInitialTaskHeaderToBeVisible(): Promise<void> {
    const heading = this.page.getByRole('heading', {
      name: this.textMock('process_editor.configuration_panel_data_task'),
    });

    await expect(heading).toBeVisible();
  }

  public async clickOnDataModelButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_set_data_model'),
      })
      .click();
  }

  public async waitForDataModelComboboxToBeVisible(): Promise<void> {
    const combobox = this.page.getByRole('combobox', {
      name: this.textMock('process_editor.configuration_panel_set_data_model'),
    });
    await expect(combobox).toBeVisible();
  }

  public async clickOnDeleteDataModel(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('general.delete'),
      })
      .click();
  }

  public async waitForAddDataModelButtonToBeVisible(): Promise<void> {
    const button = this.page.getByRole('button', {
      name: this.textMock('process_editor.configuration_panel_set_data_model_link'),
    });
    await expect(button).toBeVisible();
  }

  public async clickOnAddDataModel(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_set_data_model_link'),
      })
      .click();
  }

  public async clickOnDataModelCombobox(): Promise<void> {
    await this.page
      .getByRole('combobox', {
        name: this.textMock('process_editor.configuration_panel_set_data_model'),
      })
      .click();
  }

  public async clickOnDataModelOption(option: string): Promise<void> {
    await this.page.getByRole('option', { name: option }).click();
  }

  public async waitForDataModelButtonToBeVisible(): Promise<void> {
    const button = this.page.getByRole('button', {
      name: this.textMock('process_editor.configuration_panel_set_data_model'),
    });
    await expect(button).toBeVisible();
  }

  public async verifyDataModelButtonTextIsSelectedDataModel(option: string): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_set_data_model') + option,
      })
      .isVisible();
  }

  public async verifyThatAddNewDataModelButtonIsHidden(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_set_data_model_link'),
      })
      .isHidden();
  }

  public async clickOnActionsAccordion(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_actions_title'),
      })
      .click();
  }

  public async waitForAddActionsButtonToBeVisible(): Promise<void> {
    const button = this.page.getByRole('button', {
      name: this.textMock('process_editor.configuration_panel_actions_add_new'),
    });
    await expect(button).toBeVisible();
  }

  public async clickAddActionsButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_actions_add_new'),
      })
      .click();
  }

  public async waitForActionComboboxTitleToBeVisible(
    actionIndex: string,
    actionName?: string,
  ): Promise<void> {
    const combobox = this.page.getByRole('combobox', {
      name: this.textMock('process_editor.configuration_panel_actions_action_label', {
        actionIndex,
        actionName: actionName ?? '',
      }),
    });
    await expect(combobox).toBeVisible();
  }

  public async clickOnActionCombobox(actionIndex: string, actionName?: string): Promise<void> {
    await this.page
      .getByRole('combobox', {
        name: this.textMock('process_editor.configuration_panel_actions_action_label', {
          actionIndex,
          actionName: actionName ?? '',
        }),
      })
      .click();
  }

  public async clickOnActionOption(action: string): Promise<void> {
    await this.page.getByRole('option', { name: action }).click();
  }

  public async removeFocusFromActionCombobox(
    actionIndex: string,
    actionName?: string,
  ): Promise<void> {
    await this.page
      .getByRole('combobox', {
        name: this.textMock('process_editor.configuration_panel_actions_action_label', {
          actionIndex,
          actionName: actionName ?? '',
        }),
      })
      .blur();
  }

  public async clickOnSaveActionButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('general.save'),
      })
      .click();
  }

  public async waitForActionButtonToBeVisible(
    actionIndex: string,
    actionName?: string,
  ): Promise<void> {
    const button = this.page.getByRole('button', {
      name: this.textMock('process_editor.configuration_panel_actions_action_label', {
        actionIndex,
        actionName: actionName ?? '',
      }),
    });
    await expect(button).toBeVisible();
  }

  public async typeValueInActionCombobox(
    customText: string,
    actionIndex: string,
    actionName?: string,
  ): Promise<void> {
    await this.page
      .getByRole('combobox', {
        name: this.textMock('process_editor.configuration_panel_actions_action_label', {
          actionIndex,
          actionName: actionName ?? '',
        }),
      })
      .fill(customText);
  }

  public async verifyThatCustomActionTextIsVisible(): Promise<void> {
    const text = this.page.getByText(
      this.textMock('process_editor.configuration_panel_actions_custom_action'),
    );
    await expect(text).toBeVisible();
  }

  public async clickOnPolicyAccordion(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_policy_title'),
      })
      .click();
  }

  public async waitForNavigateToPolicyButtonIsVisible(): Promise<void> {
    const button = this.page.getByRole('button', {
      name: this.textMock(
        'process_editor.configuration_panel.edit_policy_open_policy_editor_button',
      ),
    });
    await expect(button).toBeVisible();
  }

  public async clickOnNavigateToPolicyEditorButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock(
          'process_editor.configuration_panel.edit_policy_open_policy_editor_button',
        ),
      })
      .click();
  }

  public async waitForPolicyEditorModalTabToBeVisible(): Promise<void> {
    const heading = this.page.getByRole('heading', {
      name: this.textMock('policy_editor.rules'),
      level: 2,
    });
    await expect(heading).toBeVisible();
  }

  public async dragTaskInToBpmnEditor(
    task: BpmnTaskType,
    dropElementSelector: string,
    extraDistanceX?: number,
    extraDistanceY?: number,
  ) {
    const boundingBox = await this.page.locator(dropElementSelector).boundingBox();
    const targetX = boundingBox.width / 2 + (extraDistanceX ?? 0);
    const targetY = boundingBox.y + boundingBox.height / 2 + (extraDistanceY ?? 0);

    const title = `Create Altinn ${task} task`;
    await this.startDragElement(title);
    await this.stopDragElement(targetX, targetY);
  }

  public async waitForTaskToBeVisibleInConfigPanel(task: BpmnTaskType): Promise<void> {
    const text = this.page.getByText(`Navn: Altinn ${task} task`);
    await expect(text).toBeVisible();
  }

  public async getTaskIdFromOpenNewlyAddedTask(): Promise<string> {
    const selector = 'text=ID: Activity_';
    await this.page.waitForSelector(selector);
    return await this.getFullIdFromButtonSelector(selector);
  }

  public async clickOnTaskIdEditButton(id: string): Promise<void> {
    await this.page
      .getByText(`${this.textMock('process_editor.configuration_panel_id_label')} ${id}`)
      .click();
  }

  public async waitForEditIdInputFieldToBeVisible(): Promise<void> {
    const inputField = this.page.getByRole('textbox', {
      name: this.textMock('process_editor.configuration_panel_change_task_id'),
    });
    await expect(inputField).toBeVisible();
  }

  public async emptyIdInputfield(): Promise<void> {
    await this.page
      .getByRole('textbox', {
        name: this.textMock('process_editor.configuration_panel_change_task_id'),
      })
      .clear();
  }

  public async writeNewId(id: string): Promise<void> {
    await this.page
      .getByRole('textbox', {
        name: this.textMock('process_editor.configuration_panel_change_task_id'),
      })
      .fill(id);
  }

  public async waitForTextBoxToHaveValue(id: string): Promise<void> {
    const textBox = this.page.getByRole('textbox', {
      name: this.textMock('process_editor.configuration_panel_change_task_id'),
    });
    await expect(textBox).toHaveValue(id);
  }

  public async saveNewId(): Promise<void> {
    await this.page
      .getByRole('textbox', {
        name: this.textMock('process_editor.configuration_panel_change_task_id'),
      })
      .blur();
  }

  public async waitForNewTaskIdButtonToBeVisible(id: string): Promise<void> {
    const button = this.page.getByText(
      `${this.textMock('process_editor.configuration_panel_id_label')} ${id}`,
    );
    await expect(button).toBeVisible();
  }

  public async verifyThatThereAreNoDataModelsAvailable(): Promise<void> {
    const noDataModelMessage = this.page.getByText(
      this.textMock('process_editor.configuration_panel_no_data_model_to_select'),
    );
    await expect(noDataModelMessage).toBeVisible();
  }

  public async pressEscapeOnKeyboard(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  public async clickOnConnectionArrow(): Promise<void> {
    await this.page.getByTitle(connectionArrowText).click();
  }

  public async verifyThatPolicyEditorIsOpen(): Promise<void> {
    const heading = this.page.getByRole('heading', {
      name: this.textMock('policy_editor.rules'),
      level: 2,
    });
    await expect(heading).toBeVisible();
  }
  public async closePolicyEditor(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('settings_modal.close_button_label'),
      })
      .click();
  }

  public async verifyThatPolicyEditorIsClosed(): Promise<void> {
    const heading = this.page.getByRole('heading', {
      name: this.textMock('policy_editor.rules'),
      level: 2,
    });
    await expect(heading).toBeHidden();
  }

  public async clickDataTypesToSignCombobox(): Promise<void> {
    await this.page
      .getByRole('combobox', {
        name: this.textMock('process_editor.configuration_panel_set_data_types_to_sign'),
      })
      .click();
  }

  public async clickOnDataTypesToSignOption(option: string): Promise<void> {
    await this.page.getByRole('option', { name: option }).click();
  }

  public async waitForDataTypeToSignButtonToBeVisible(option: string): Promise<void> {
    const button = this.page.getByLabel(
      /*'button', {
      name*/ this.textMock('general.delete_item', { item: option }),
      /*}*/
    );
    await expect(button).toBeVisible();
  }

  public async tabOutOfDataTypesToSignCombobox(option: string): Promise<void> {
    const comboboxName: string = this.textMock(
      'process_editor.configuration_panel_set_data_types_to_sign',
    );
    // First tab out of the combobox, then out of the X-button inside the combobox
    await this.page.getByRole('option', { name: option }).blur();
    await this.page.getByRole('combobox', { name: comboboxName }).blur();
  }

  /**
   *
   * Helper methods below this
   *
   */

  private async startDragElement(title: string): Promise<void> {
    await this.page.getByTitle(title).hover();
    await this.page.mouse.down();
  }

  private async stopDragElement(xPosition: number, yPosition: number): Promise<void> {
    const numberOfMouseMoveEvents: number = 20;
    await this.page.mouse.move(xPosition, yPosition, { steps: numberOfMouseMoveEvents });
    await this.page.mouse.up();
  }

  private async getFullIdFromButtonSelector(selector: string): Promise<string> {
    const button = this.page.locator(selector);
    const fullText = await button.textContent();
    const extractedText = fullText.match(/ID: (Activity_\w+)/);
    const fullId: string = extractedText[1];
    return fullId;
  }
}
