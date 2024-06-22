import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioNativeSelect } from '@studio/components';
import { useActionHandler } from '../hooks/useOnActionChange';
import { useBpmnContext } from '../../../../../../contexts/BpmnContext';
import { getAvailablePredefinedActions, isActionAvailable } from '../../actionsUtils';
import { type Action, BpmnActionModeler } from '../../../../../../utils/bpmn/BpmnActionModeler';

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
      defaultValue={actionElement.action || ' '}
    >
      <option disabled value=' '></option>
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
