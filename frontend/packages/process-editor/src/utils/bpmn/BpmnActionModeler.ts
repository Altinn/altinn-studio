import { StudioModeler } from '@altinn/process-editor/utils/bpmn/StudioModeler';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import { getPredefinedActions } from '@altinn/process-editor/components/ConfigPanel/ConfigContent/EditActions/ActionsUtils';

export type Action = ModdleElement;
export type ActionsElement = {
  action: Action[];
};

export enum ActionType {
  Server = 'serverAction',
  Process = 'processAction',
}

export enum ActionTagType {
  Action = 'altinn:Action',
  Actions = 'altinn:Actions',
}

export class BpmnActionModeler extends StudioModeler {
  constructor(element?: Element) {
    super(element);
  }

  public get actionElements(): ActionsElement | undefined {
    return this.getElement()?.businessObject.extensionElements?.values[0]?.actions;
  }

  public getExtensionElements(): Action | undefined {
    return this.getElement()?.businessObject.extensionElements?.values[0];
  }

  public get hasActionsAlready(): boolean {
    return this.actionsElements?.length > 0;
  }

  public getTypeForAction(actionElement: Action): ActionType | undefined {
    return actionElement.type || actionElement.$attrs?.type;
  }

  public addNewActionToTask(generatedActionName: string | undefined): void {
    const actionElement = this.createActionElement(generatedActionName);
    const actionsElement = this.createActionsElement(actionElement);

    this.updateModdleProperties(
      {
        actions: actionsElement,
      },
      this.getElement().businessObject.extensionElements.values[0],
    );
  }

  public deleteActionFromTask(actionElement: Action): void {
    const actionsElement = this.actionElements;
    const index = actionsElement.action.indexOf(actionElement);
    actionsElement.action.splice(index, 1);

    const hasActions = actionsElement?.action.length > 0;
    if (hasActions) {
      this.updateModdleProperties(
        {
          actions: actionsElement,
        },
        this.getElement().businessObject.extensionElements.values[0],
      );
      return;
    }

    this.updateModdleProperties(
      {
        actions: undefined,
      },
      this.getElement().businessObject.extensionElements.values[0],
    );
  }

  public updateActionNameOnActionElement(actionElement: ModdleElement, newAction: string): void {
    if (actionElement?.action === newAction || newAction === '') return;

    if (getPredefinedActions(this.getCurrentTaskType).includes(newAction)) {
      delete actionElement.type;
    }

    this.updateModdleProperties(
      {
        action: newAction,
      },
      actionElement,
    );
  }

  public updateTypeForAction(actionElement: Action, actionType: ActionType): void {
    const actionsElement = this.actionElements;
    if (!actionsElement) throw new Error('No actions element found, cannot update type for action');

    console.log({ actionElement, actionsElement });
    const actionIndex = actionsElement.action.indexOf(actionElement);
    console.log({ actionIndex, result: actionsElement.action[actionIndex] });
    actionsElement.action[actionIndex].type = actionType;
    this.updateModdleProperties(
      {
        actions: actionsElement,
      },
      this.getExtensionElements,
    );
  }

  public createActionElement(actionName: string | undefined): ModdleElement {
    return this.bpmnFactory.create(ActionTagType.Action, {
      action: actionName,
    });
  }

  private get actionsElements(): Action[] | undefined {
    return this.actionElements?.action;
  }

  private createActionsElement(actionElement: ModdleElement): ModdleElement {
    return this.bpmnFactory.create(ActionTagType.Actions, {
      action: [actionElement],
    });
  }
}
