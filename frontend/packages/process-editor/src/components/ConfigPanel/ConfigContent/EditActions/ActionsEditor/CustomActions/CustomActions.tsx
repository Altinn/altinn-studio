import React from 'react';
import { StudioTextfield } from '@studio/components';
import { Switch } from '@digdir/design-system-react';
import { useDebounce } from 'app-shared/hooks/useDebounce';
import { BpmnActionModeler, ActionType } from '../../../../../../utils/bpmn/BpmnActionModeler';
import type { Action } from '../../../../../../utils/bpmn/BpmnActionModeler';
import { useActionHandler } from '../hooks/useOnActionChange';
import { getPredefinedActions } from '../../ActionsUtils';
import { useBpmnContext } from '../../../../../../contexts/BpmnContext';

import classes from './CustomActions.module.css';
import { useTranslation } from 'react-i18next';

export type CustomActionsProps = {
  actionElement: Action;
};
export const CustomActions = ({ actionElement }: CustomActionsProps): React.ReactElement => {
  const { t } = useTranslation();
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
        label={t('process_editor.configuration_panel_actions_action_card_custom_label')}
        className={classes.customActionTextfield}
        value={isCustomAction ? actionElement.action : ''}
      />
      <Switch
        size='small'
        onChange={onActionTypeChange}
        value={currentActionType}
        checked={currentActionType === ActionType.Server}
      >
        {t('process_editor.configuration_panel_actions_set_server_action_label')}
      </Switch>
    </div>
  );
};
