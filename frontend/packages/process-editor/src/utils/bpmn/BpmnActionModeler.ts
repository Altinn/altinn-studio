import { StudioModeler } from '@altinn/process-editor/utils/bpmn/StudioModeler';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import { getPredefinedActions } from '@altinn/process-editor/components/ConfigPanel/ConfigContent/EditActions/ActionsUtils';

export type Action = ModdleElement;
type ActionsElement = {
  action: Action[];
};

enum ActionTagType {
  Action = 'altinn:Action',
  Actions = 'altinn:Actions',
}

export class BpmnActionModeler extends StudioModeler {
  constructor(element?: Element) {
    super(element);
  }

  public get actionElements(): ActionsElement {
    return this.getElement()?.businessObject.extensionElements?.values[0]?.actions ?? [];
  }

  public get hasActionsAlready(): boolean {
    console.log(this.actionElements);
    return this.actionsElements?.length > 0;
  }

  public addNewActionToTask(generatedActionName: string | undefined): void {
    const actionElement = this.createActionElement(generatedActionName);
    const actionsElement = this.createActionsElement(actionElement);

    this.updateModdleProperties({
      actions: actionsElement,
    });
  }

  public updateActionNameOnActionElement(actionElement: ModdleElement, newAction: string): void {
    if (actionElement?.action === newAction || newAction === '') return;

    // TODO: figure out why we need the if block below.
    if (getPredefinedActions(this.getCurrentTaskType).includes(newAction)) {
      delete actionElement.type;
    }

    this.updateModdleProperties({
      action: newAction,
    });
  }

  private get actionsElements(): Action[] | undefined {
    return this.actionElements?.action;
  }

  private createActionElement(actionName: string | undefined): ModdleElement {
    return this.bpmnFactory.create(ActionTagType.Action, {
      action: actionName,
    });
  }

  private createActionsElement(actionElement: ModdleElement): ModdleElement {
    return this.bpmnFactory.create(ActionTagType.Actions, {
      action: [actionElement],
    });
  }
}
