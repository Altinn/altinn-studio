import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ActionsConfig } from './ActionsConfig';
import { PolicyConfig } from './PolicyConfig';
import { BasePage } from '../../helpers/BasePage';
import { DataModelConfig } from './DataModelConfig';
import { SigningTaskConfig } from './SigningTaskConfig';
import { CustomReceiptConfig } from './CustomReceiptConfig';
import { type BpmnTaskType } from '../../types/BpmnTaskType';
import type { Environment } from '../../helpers/StudioEnvironment';

const connectionArrowText: string = 'Connect using Sequence/MessageFlow or Association';

export class ProcessEditorPage extends BasePage {
  public readonly dataModelConfig: DataModelConfig;
  public readonly actionsConfig: ActionsConfig;
  public readonly policyConfig: PolicyConfig;
  public readonly customReceiptConfig: CustomReceiptConfig;
  public readonly signingTaskConfig: SigningTaskConfig;

  constructor(page: Page, environment?: Environment) {
    super(page, environment);
    this.dataModelConfig = new DataModelConfig(page);
    this.actionsConfig = new ActionsConfig(page);
    this.policyConfig = new PolicyConfig(page);
    this.customReceiptConfig = new CustomReceiptConfig(page);
    this.signingTaskConfig = new SigningTaskConfig(page);
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

  public async dragTaskInToBpmnEditor(
    task: BpmnTaskType,
    dropElementSelector: string,
    extraDistanceX?: number,
    extraDistanceY?: number,
  ) {
    const boundingBox = await this.page.locator(dropElementSelector).boundingBox();
    const targetX = boundingBox.width / 2 + (extraDistanceX ?? 0);
    const targetY = boundingBox.y + boundingBox.height / 2 + (extraDistanceY ?? 0);

    const title = `Create ${task} task`;
    await this.startDragElement(title);
    await this.stopDragElement(targetX, targetY);
  }

  public async skipRecommendedTask(): Promise<void> {
    const skipButton = this.page.getByRole('button', { name: this.textMock('general.skip') });
    await skipButton.click();
  }

  public async waitForTaskToBeVisibleInConfigPanel(task: BpmnTaskType): Promise<void> {
    const nameLabel = this.textMock('process_editor.configuration_panel_name_label');
    const taskName = `Altinn ${task} task`;
    const text = this.page.getByText(nameLabel + taskName);
    await expect(text).toBeVisible();
  }

  public async getTaskIdFromOpenNewlyAddedTask(): Promise<string> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_change_task_id'),
      })
      .click();
    const textbox = this.page.getByRole('textbox', {
      name: this.textMock('process_editor.configuration_panel_change_task_id'),
    });
    const taskId = await textbox.inputValue();
    await textbox.blur();
    return taskId;
  }

  public async clickOnTaskIdEditButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('process_editor.configuration_panel_change_task_id'),
      })
      .click();
  }

  public async waitForEditIdInputFieldToBeVisible(): Promise<void> {
    const inputField = this.page.getByRole('textbox', {
      name: this.textMock('process_editor.configuration_panel_change_task_id'),
    });
    await expect(inputField).toBeVisible();
  }

  public async emptyIdTextfield(): Promise<void> {
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
      `${this.textMock('process_editor.configuration_panel_change_task_id')}${id}`,
    );
    await expect(button).toBeVisible();
  }

  public async pressEscapeOnKeyboard(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  public async clickOnConnectionArrow(): Promise<void> {
    await this.page.locator('[data-action="connect"]').click();
    // await this.page.getByTitle(connectionArrowText).click();
  }

  public async waitForEndEventHeaderToBeVisible(): Promise<void> {
    const heading = this.page.getByRole('heading', {
      name: this.textMock('process_editor.configuration_panel_end_event'),
    });

    await expect(heading).toBeVisible();
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
}
