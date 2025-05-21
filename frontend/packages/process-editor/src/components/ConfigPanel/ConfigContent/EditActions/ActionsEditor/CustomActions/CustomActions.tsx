import React from 'react';
import { StudioTextfield } from '@studio/components-legacy';
import { StudioHelpText } from '@studio/components';
import { useDebounce } from '@studio/hooks';
import { Switch } from '@digdir/designsystemet-react';
import {
  BpmnActionModeler,
  ActionType,
} from '../../../../../../utils/bpmnModeler/BpmnActionModeler';
import type { Action } from '../../../../../../utils/bpmnModeler/BpmnActionModeler';
import { useActionHandler } from '../hooks/useOnActionChange';
import { getPredefinedActions } from '../../../../../../utils/processActions';
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
    const actionType = isChecked ? ActionType.Process : ActionType.Server;
    bpmnActionModeler.updateTypeForAction(actionElement, actionType);
  };

  const isCustomAction = !getPredefinedActions(bpmnDetails.taskType).includes(actionElement.action);
  const currentActionType = bpmnActionModeler.getTypeForAction(actionElement) || ActionType.Process;

  return (
    <>
      <StudioTextfield
        onChange={onCustomActionChange}
        label={t('process_editor.configuration_panel_actions_action_card_custom_label')}
        className={classes.customActionTextfield}
        value={isCustomAction ? actionElement.action : ''}
      />
      <div className={classes.actionTypeContainer}>
        <Switch
          size='small'
          onChange={onActionTypeChange}
          value={currentActionType}
          checked={currentActionType === ActionType.Process}
          disabled={!isCustomAction}
        >
          {t('process_editor.configuration_panel_actions_set_server_action_label')}
        </Switch>
        <StudioHelpText
          aria-label={t('process_editor.configuration_panel_actions_action_type_help_text')}
        >
          {t('process_editor.configuration_panel_actions_set_server_action_info')}
        </StudioHelpText>
      </div>
    </>
  );
};
