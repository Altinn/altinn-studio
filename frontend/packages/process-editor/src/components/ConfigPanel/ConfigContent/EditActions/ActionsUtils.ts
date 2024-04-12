import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import type { BpmnDetails } from '../../../../types/BpmnDetails';
import type { ActionType } from './EditActions';

export const addNewActionToTask = (
  bpmnFactory: BpmnFactory,
  modeling: Modeling,
  generatedActionName: string,
  bpmnDetails: BpmnDetails,
) => {
  const actionsElement: ModdleElement =
    bpmnDetails.element.businessObject.extensionElements.values[0].actions;
  const newActionElement: ModdleElement = bpmnFactory.create('altinn:Action', {
    action: generatedActionName,
  });
  // Task has actions in element from before
  if (actionsElement) {
    actionsElement.action.push(newActionElement);
    updateExistingActionsOnTask(modeling, bpmnDetails, actionsElement);
  } else {
    addFirstActionOnTask(bpmnFactory, modeling, bpmnDetails, newActionElement);
  }
};

export const updateActionNameOnActionElement = (
  actionElement: ModdleElement,
  newAction: string,
  modeling: Modeling,
  bpmnDetails: BpmnDetails,
) => {
  if (actionElement.action === newAction) return;
  if (getPredefinedActions(bpmnDetails.taskType).includes(newAction)) {
    delete actionElement.type;
  }
  updateActionNameOnExistingAction(modeling, bpmnDetails, actionElement, newAction);
};

export const deleteActionFromTask = (
  bpmnDetails: BpmnDetails,
  actionElement: ModdleElement,
  modeling: Modeling,
) => {
  const actionsElement = bpmnDetails.element.businessObject.extensionElements.values[0].actions;
  const index = actionsElement.action.indexOf(actionElement);
  actionsElement.action.splice(index, 1);
  if (actionsElement.action.length > 0) {
    updateExistingActionsOnTask(modeling, bpmnDetails, actionsElement);
  } else {
    updateExistingActionsOnTask(modeling, bpmnDetails, undefined);
  }
};

export const setActionTypeOnAction = (
  actionType: ActionType,
  bpmnDetails: BpmnDetails,
  actionElement: ModdleElement,
  modeling: Modeling,
) => {
  const actionsElement = bpmnDetails.element.businessObject.extensionElements.values[0].actions;
  actionElement.$attrs.type = actionType;
  if (actionElement.type) delete actionElement.type;
  updateExistingActionsOnTask(modeling, bpmnDetails, actionsElement);
};

const addFirstActionOnTask = (
  bpmnFactory: BpmnFactory,
  modeling: Modeling,
  bpmnDetails: BpmnDetails,
  newActionElement: ModdleElement,
) => {
  const newActionsElement: ModdleElement = bpmnFactory.create('altinn:Actions', {
    action: [newActionElement],
  });
  updateExistingActionsOnTask(modeling, bpmnDetails, newActionsElement);
};

const updateExistingActionsOnTask = (
  modeling: Modeling,
  bpmnDetails: BpmnDetails,
  updatedActionsElement: ModdleElement[],
) => {
  modeling.updateModdleProperties(
    bpmnDetails.element,
    bpmnDetails.element.businessObject.extensionElements.values[0],
    {
      actions: updatedActionsElement,
    },
  );
};

const updateActionNameOnExistingAction = (
  modeling: Modeling,
  bpmnDetails: BpmnDetails,
  actionElementToUpdate: ModdleElement,
  newActionName: string,
) => {
  modeling.updateModdleProperties(bpmnDetails.element, actionElementToUpdate, {
    action: newActionName,
  });
};

export const getPredefinedActions = (bpmnTaskType: string): string[] => {
  const allPredefinedActions = ['write', 'reject', 'confirm'];
  if (bpmnTaskType === 'signing') allPredefinedActions.push('sign');
  //if (bpmnDetails.taskType !== 'payment') allPredefinedActions.push('pay');
  return allPredefinedActions;
};

export const getTypeForAction = (actionElement: ModdleElement) => {
  return (actionElement?.type || actionElement?.$attrs?.type) ?? undefined;
};

export const isActionRequiredForTask = (action: string, bpmnDetails: BpmnDetails): boolean => {
  if (bpmnDetails.taskType === 'signing' && action === 'sign') return true;
  return bpmnDetails.taskType === 'confirmation' && action === 'confirm';
};

export const generateActionName = (
  availablePredefinedActions: string[],
  actionElements: ModdleElement[],
  bpmnDetails: BpmnDetails,
) =>
  availablePredefinedActions[0] ??
  `myCustomAction_${actionElements.length - getPredefinedActions(bpmnDetails.taskType).length}`;

export const filterAvailableActions = (
  predefinedActionNames: string[],
  existingActionElements: ModdleElement[],
): string[] => {
  return predefinedActionNames.filter((actionName: string) =>
    isActionAvailable(actionName, existingActionElements),
  );
};

const isActionAvailable = (
  actionName: string,
  existingActionElements: ModdleElement[],
): boolean => {
  return !existingActionElements.some(
    (actionElement: ModdleElement) => actionElement.action === actionName,
  );
};
