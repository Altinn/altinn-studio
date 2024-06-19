import React from 'react';
import { StudioNativeSelect } from '@studio/components';
import { Action, BpmnActionModeler } from '@altinn/process-editor/utils/bpmn/BpmnActionModeler';
import { useBpmnContext } from '@altinn/process-editor/contexts/BpmnContext';
import {
  getAvailablePredefinedActions,
  isActionAvailable,
} from '@altinn/process-editor/components/ConfigPanel/ConfigContent/EditActions/ActionsUtils';
import { useTranslation } from 'react-i18next';
import { useActionHandler } from '../hooks/useOnActionChange';

type PredefinedActionsProps = {
  actionElement: Action;
};
export const PredefinedActions = ({
  actionElement,
}: PredefinedActionsProps): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  const bpmnActionModeler = new BpmnActionModeler(bpmnDetails.element);
  const { handleOnActionChange } = useActionHandler(actionElement);

  const actions = bpmnActionModeler.actionElements?.action || [];
  const availablePredefinedActions = getAvailablePredefinedActions(bpmnDetails.taskType);

  const shouldDisableAction = (action: string): boolean => {
    return !isActionAvailable(action, actions) && !(action === actionElement.action);
  };

  return (
    <StudioNativeSelect
      size='small'
      label={t('process_editor.configuration_panel_actions_action_selector_label')}
      onChange={handleOnActionChange}
      defaultValue={actionElement.action}
    >
      <option disabled selected={!actionElement.action}></option>
      {availablePredefinedActions.map(
        (action: string): React.ReactElement => (
          <option key={action} value={action} disabled={shouldDisableAction(action)}>
            {action}
          </option>
        ),
      )}
    </StudioNativeSelect>
  );
};
