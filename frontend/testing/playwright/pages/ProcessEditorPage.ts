import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

type BpmnTaskType = 'data' | 'feedback' | 'signing' | 'confirm';

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

  public async clickOnInitialTask(elementSelector: string): Promise<void> {
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

  public async waitForActionComboboxToBeVisible(
    actionIndex: string,
    actionName?: string,
  ): Promise<void> {
    const combobox = this.page.getByRole('combobox', {
      name: this.textMock('process_editor.configuration_panel_actions_action_label', {
        actionIndex,
        actionName,
      }),
    });
    await expect(combobox).toBeVisible();
  }

  public async clickOnActionCombobox(actionIndex: string, actionName?: string): Promise<void> {
    this.page
      .getByRole('combobox', {
        name: this.textMock('process_editor.configuration_panel_actions_action_label', {
          actionIndex,
          actionName,
        }),
      })
      .click();
  }

  public async clickOnActionOption(action: string): Promise<void> {
    await this.page.getByRole('option', { name: action }).click();
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
        actionName,
      }),
    });
    await expect(button).toBeVisible();
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

  public async dragTaskInToBpmnEditor(task: BpmnTaskType) {
    const elementSelector = 'svg[data-element-id="SingleDataTask"]';
    await this.page.waitForSelector(elementSelector);

    const element = this.page.locator(elementSelector);
    const boundingBox = await element.boundingBox();

    const targetX = boundingBox.width / 2;
    const targetY = boundingBox.height / 2;

    const title = `Create Altinn ${task} task`;

    await this.page.getByTitle(title).hover();
    await this.page.mouse.down();
    const numberOfMouseMoveEvents: number = 20;
    await this.page.mouse.move(targetX, targetY, { steps: numberOfMouseMoveEvents });
    await this.page.mouse.up();
  }

  public async waitForTaskToBeVisibleInConfigPanel(task: BpmnTaskType): Promise<void> {
    const text = this.page.getByText(`Altinn ${task} task`);
    await expect(text).toBeVisible();
  }

  public async getTaskIdFromOpenNewlyAddedTask(): Promise<string> {
    const selector = 'text=ID: Activity_';
    await this.page.waitForSelector(selector);
    return await this.getFullIdFromButtonSelector(selector);
  }

  private async getFullIdFromButtonSelector(selector: string): Promise<string> {
    const button = this.page.locator(selector);
    const fullText = await button.textContent();
    const extractedText = fullText.match(/ID: (Activity_\w+)/);
    const fullId: string = extractedText[0];
    return fullId;
  }
}
