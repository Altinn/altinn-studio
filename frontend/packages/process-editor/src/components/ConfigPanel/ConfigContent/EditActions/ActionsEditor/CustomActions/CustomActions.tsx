import React from 'react';
import { StudioTextfield } from '@studio/components';
import { Switch } from '@digdir/design-system-react';

import {
  Action,
  ActionType,
  BpmnActionModeler,
} from '@altinn/process-editor/utils/bpmn/BpmnActionModeler';
import { useActionHandler } from '@altinn/process-editor/components/ConfigPanel/ConfigContent/EditActions/ActionsEditor/hooks/useOnActionChange';
import { useDebounce } from 'app-shared/hooks/useDebounce';
import { getPredefinedActions } from '@altinn/process-editor/components/ConfigPanel/ConfigContent/EditActions/ActionsUtils';
import { useBpmnContext } from '@altinn/process-editor/contexts/BpmnContext';

import classes from './CustomActions.module.css';

type CustomActionsProps = {
  actionElement: Action;
};
export const CustomActions = ({ actionElement }: CustomActionsProps): React.ReactElement => {
  const { bpmnDetails } = useBpmnContext();
  const { handleOnActionChange } = useActionHandler(actionElement);
  const { debounce } = useDebounce({ debounceTimeInMs: 300 });
  const bpmnActionModeler = new BpmnActionModeler(bpmnDetails.element);

  const onCustomActionChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    debounce(() => handleOnActionChange(event));
  };

  const onActionTypeChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const isChecked = event.target.checked;
    const actionType = isChecked ? ActionType.Server : ActionType.Process;
    bpmnActionModeler.updateTypeForAction(actionElement, actionType);
  };

  const isCustomAction = !getPredefinedActions(bpmnDetails.taskType).includes(actionElement.action);
  const currentActionType = bpmnActionModeler.getTypeForAction(actionElement) || ActionType.Process;

  return (
    <div>
      <StudioTextfield
        onChange={onCustomActionChange}
        size='small'
        label='Skriv inn navnet på handlingen du vil lage'
        className={classes.customActionTextfield}
        value={isCustomAction ? actionElement.action : ''}
      />
      <Switch
        size='small'
        onChange={onActionTypeChange}
        value={currentActionType}
        checked={currentActionType === ActionType.Server}
      >
        Skal handlingen utføres automatisk?
      </Switch>
    </div>
  );
};
