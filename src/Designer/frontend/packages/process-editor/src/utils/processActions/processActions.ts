import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type { BpmnTaskType } from '../../types/BpmnTaskType';

export const getPredefinedActions = (bpmnTaskType: BpmnTaskType): string[] => {
  const allPredefinedActions = ['write', 'reject', 'confirm'];
  if (bpmnTaskType === 'signing') allPredefinedActions.push('sign');
  if (bpmnTaskType === 'payment') allPredefinedActions.push('pay');
  return allPredefinedActions;
};

export const isActionRequiredForTask = (action: string, bpmnTaskType: BpmnTaskType): boolean => {
  if (bpmnTaskType === 'signing' && action === 'sign') return true;
  if (bpmnTaskType === 'signing' && action === 'reject') return true;
  if (bpmnTaskType === 'payment' && action === 'pay') return true;
  if (bpmnTaskType === 'payment' && action === 'confirm') return true;
  if (bpmnTaskType === 'payment' && action === 'reject') return true;
  return bpmnTaskType === 'confirmation' && action === 'confirm';
};

export const isActionAvailable = (
  actionName: string,
  existingActionElements: ModdleElement[],
): boolean => {
  return !existingActionElements.some(
    (actionElement: ModdleElement) => actionElement.action === actionName,
  );
};
