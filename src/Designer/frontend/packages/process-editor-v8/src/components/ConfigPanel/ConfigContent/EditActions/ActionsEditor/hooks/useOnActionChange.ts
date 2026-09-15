import type React from 'react';
import { useBpmnContext } from '../../../../../../contexts/BpmnContext';
import {
  type Action,
  BpmnActionModeler,
} from '../../../../../../utils/bpmnModeler/BpmnActionModeler';

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
