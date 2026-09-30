import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type { Element } from 'bpmn-js/lib/model/Types';
import { StudioModeler } from './StudioModeler';
import { getPredefinedActions } from '../processActions';

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

/*
 * Not all lines in this file are covered by tests because it would require extensive mocking of methods and classes from the bpmn-js library.
 * This effort might not be worthwhile since the package is not very type-safe, meaning our tests might not fail even if the package's API changes.
 */

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

    this.updateActionsProperties(actionsElement);
  }

  public deleteActionFromTask(actionElement: Action): void {
    const actionsElement = this.actionElements;
    const index = actionsElement.action.indexOf(actionElement);
    actionsElement.action.splice(index, 1);

    const hasActions = actionsElement?.action.length > 0;
    this.updateActionsProperties(hasActions ? actionsElement : undefined);
  }

  public updateActionNameOnActionElement(actionElement: ModdleElement, newAction: string): void {
    if (actionElement?.action === newAction || newAction === '') return;

    if (getPredefinedActions(this.getCurrentTaskType).includes(newAction)) {
      delete actionElement.type;
    }
    this.updateActionProperties(newAction, actionElement);
  }

  public updateTypeForAction(actionElement: Action, actionType: ActionType): void {
    const actionsElement = this.actionElements;
    if (!actionsElement) throw new Error('No actions element found, cannot update type for action');

    const actionIndex = actionsElement.action.indexOf(actionElement);
    actionsElement.action[actionIndex].type = actionType;

    this.updateActionsProperties(actionsElement);
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

  private updateActionsProperties(actionsElement: ActionsElement): void {
    this.updateModdleProperties(
      {
        actions: actionsElement,
      },
      this.getExtensionElements(),
    );
  }

  private updateActionProperties(actionName: string, actionElement: Action): void {
    this.updateModdleProperties(
      {
        action: actionName,
      },
      actionElement,
    );
  }
}
