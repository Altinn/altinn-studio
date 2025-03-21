import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioNativeSelect } from '@studio/components-legacy';
import { useActionHandler } from '../hooks/useOnActionChange';
import { useBpmnContext } from '../../../../../../contexts/BpmnContext';
import { getPredefinedActions, isActionAvailable } from '../../../../../../utils/processActions';
import {
  type Action,
  BpmnActionModeler,
} from '../../../../../../utils/bpmnModeler/BpmnActionModeler';

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
  const availablePredefinedActions = getPredefinedActions(bpmnDetails.taskType);

  const shouldDisableAction = (action: string): boolean => {
    return !isActionAvailable(action, actions) && !(action === actionElement.action);
  };

  const isPredefinedAction = (action: string): boolean => {
    return availablePredefinedActions.includes(action);
  };

  return (
    <StudioNativeSelect
      id='predefined-action-select'
      size='small'
      label={t('process_editor.configuration_panel_actions_action_selector_label')}
      onChange={handleOnActionChange}
      defaultValue={isPredefinedAction(actionElement.action) ? actionElement.action : ' '}
    >
      <option disabled value=' ' />
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
