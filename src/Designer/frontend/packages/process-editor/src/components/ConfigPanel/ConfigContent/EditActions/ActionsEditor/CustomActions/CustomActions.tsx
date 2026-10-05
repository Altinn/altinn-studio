import React from 'react';
import { StudioHelpText, StudioSwitch, StudioTextfield } from '@studio/components';
import { usePropState } from '@studio/hooks';
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
  const bpmnActionModeler = new BpmnActionModeler(bpmnDetails.element);

  const onActionTypeChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const isChecked = event.target.checked;
    const actionType = isChecked ? ActionType.Process : ActionType.Server;
    bpmnActionModeler.updateTypeForAction(actionElement, actionType);
  };

  const isCustomAction = !getPredefinedActions(bpmnDetails.taskType).includes(actionElement.action);
  const [actionName, setActionName] = usePropState(
    isCustomAction ? (actionElement.action ?? '') : '',
  );
  const currentActionType = bpmnActionModeler.getTypeForAction(actionElement) || ActionType.Process;

  return (
    <>
      <StudioTextfield
        onChange={(event) => setActionName(event.target.value)}
        onBlur={(event) => {
          if (event.target.value !== actionElement.action) handleOnActionChange(event);
        }}
        label={t('process_editor.configuration_panel_actions_action_card_custom_label')}
        className={classes.customActionTextfield}
        value={actionName}
      />
      <div className={classes.actionTypeContainer}>
        <StudioSwitch
          data-size='sm'
          onChange={onActionTypeChange}
          value={currentActionType}
          checked={currentActionType === ActionType.Process}
          disabled={!isCustomAction}
          label={t('process_editor.configuration_panel_actions_set_server_action_label')}
        />
        <StudioHelpText
          aria-label={t('process_editor.configuration_panel_actions_action_type_help_text')}
        >
          {t('process_editor.configuration_panel_actions_set_server_action_info')}
        </StudioHelpText>
      </div>
    </>
  );
};
