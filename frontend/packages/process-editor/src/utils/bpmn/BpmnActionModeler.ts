import { StudioModeler } from '@altinn/process-editor/utils/bpmn/StudioModeler';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import { getPredefinedActions } from '@altinn/process-editor/components/ConfigPanel/ConfigContent/EditActions/ActionsUtils';

export class BpmnActionModeler extends StudioModeler {
  private readonly bpmnFactory: BpmnFactory = this.modelerInstance.get('bpmnFactory');

  constructor(element?: Element) {
    super(element);
  }

  public get actionElements(): ModdleElement[] | undefined {
    return this.getElement()?.businessObject.extensionElements?.values[0]?.actions;
  }

  public get hasActionsAlready(): boolean {
    return this.actionElements?.length > 0;
  }

  public addNewActionToTask(generatedActionName: string | undefined): void {
    const actionElement = this.createActionElement(generatedActionName);
    const actionsElement = this.createActionsElement(actionElement);

    this.updateModdleProperties({
      actions: actionsElement,
    });
  }

  public updateActionNameOnActionElement(actionElement: ModdleElement, newAction: string): void {
    if (actionElement.action === newAction || newAction === '') return;

    // TODO: figure out why we need the if block below.
    if (getPredefinedActions(this.getElement().bpmnDetails.taskType).includes(newAction)) {
      delete actionElement.type;
    }

    this.updateModdleProperties({
      action: newAction,
    });
  }

  private createActionElement(actionName: string | undefined): ModdleElement {
    return this.bpmnFactory.create('altinn:Action', {
      action: actionName,
    });
  }

  private createActionsElement(actionElement: ModdleElement): ModdleElement {
    return this.bpmnFactory.create('altinn:Actions', {
      action: [actionElement],
    });
  }
}
