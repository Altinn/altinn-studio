import React from 'react';
import { StudioNativeSelect } from '@studio/components';
import { Action, BpmnActionModeler } from '@altinn/process-editor/utils/bpmn/BpmnActionModeler';
import { useBpmnContext } from '@altinn/process-editor/contexts/BpmnContext';
import { getAvailablePredefinedActions } from '@altinn/process-editor/components/ConfigPanel/ConfigContent/EditActions/ActionsUtils';

type PredefinedActionsProps = {
  actionElement: Action;
};
export const PredefinedActions = ({
  actionElement,
}: PredefinedActionsProps): React.ReactElement => {
  const { bpmnDetails } = useBpmnContext();
  const bpmnActionModeler = new BpmnActionModeler(bpmnDetails.element);

  const actions = bpmnActionModeler.actionElements?.action || [];
  const availablePredefinedActions = getAvailablePredefinedActions(bpmnDetails.taskType, actions);

  // TODO: make a TS Type for action instead of string and string[].
  const handleOnActionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const actionToSave = event.target.value;

    const shouldUpdateExistingActions = bpmnActionModeler.hasActionsAlready;

    if (shouldUpdateExistingActions) {
      // TODO should have an actionElement here?
      bpmnActionModeler.updateActionNameOnActionElement(actionElement, actionToSave);
      return;
    }

    bpmnActionModeler.addNewActionToTask(actionToSave);
  };

  return (
    <StudioNativeSelect label='Velg en handling fra listen' onChange={handleOnActionChange}>
      <option label=''></option>
      {availablePredefinedActions.map((action: string) => (
        <option key={action} value={action}>
          {action}
        </option>
      ))}
    </StudioNativeSelect>
  );
};
