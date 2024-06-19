import React from 'react';
import { useBpmnContext } from '@altinn/process-editor/contexts/BpmnContext';
import { Action, BpmnActionModeler } from '@altinn/process-editor/utils/bpmn/BpmnActionModeler';

type UseOnActionChangeResult = {
  handleOnActionChange: (event: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => void;
};
export const useActionHandler = (actionElement: Action): UseOnActionChangeResult => {
  const { bpmnDetails } = useBpmnContext();
  const bpmnActionModeler = new BpmnActionModeler(bpmnDetails.element);

  const handleOnActionChange = (event: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const actionToSave = event.target.value;

    const shouldUpdateExistingActions = bpmnActionModeler.hasActionsAlready;

    if (shouldUpdateExistingActions) {
      bpmnActionModeler.updateActionNameOnActionElement(actionElement, actionToSave);
      return;
    }

    bpmnActionModeler.addNewActionToTask(actionToSave);
  };

  return {
    handleOnActionChange,
  };
};
