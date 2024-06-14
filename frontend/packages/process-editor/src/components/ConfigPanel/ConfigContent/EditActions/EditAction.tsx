import type { ChangeEvent } from 'react';
import React, { useState } from 'react';
import classes from './EditAction.module.css';
import {
  deleteActionFromTask,
  getPredefinedActions,
  getTypeForAction,
  isActionRequiredForTask,
  setActionTypeOnAction,
  updateActionNameOnActionElement,
} from './ActionsUtils';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import { StudioButton, StudioDeleteButton, StudioProperty } from '@studio/components';
import { CheckmarkIcon } from '@studio/icons';
import { HelpText, Switch } from '@digdir/design-system-react';
import type { BpmnDetails } from '../../../../types/BpmnDetails';
import { useTranslation } from 'react-i18next';
import { SelectAction } from './SelectAction';

export enum ActionType {
  Server = 'serverAction',
  Process = 'processAction',
}

export interface EditActionProps {
  actionElementToEdit: ModdleElement;
  availablePredefinedActions: string[];
  bpmnDetails: BpmnDetails;
  index: number;
  modeling: Modeling;
}

export const EditAction = ({
  actionElementToEdit,
  availablePredefinedActions,
  bpmnDetails,
  index,
  modeling,
}: EditActionProps) => {
  const { t } = useTranslation();
  const [editMode, setEditMode] = useState<boolean>(actionElementToEdit.action === undefined);
  // Ideally this state is not needed. The call to update action should be triggered on direct change of the value in the combobox.
  // When this triggering can happen from both option selection and custom writing we need to keep the value in a state and pass this
  // value when clicking save-button.
  const [currentActionName, setCurrentActionName] = useState<string>(
    actionElementToEdit.action ?? '',
  );

  const setActionType = (actionElement: ModdleElement, checked: ChangeEvent<HTMLInputElement>) => {
    const actionType = checked.target.checked ? ActionType.Server : ActionType.Process;
    setActionTypeOnAction(actionType, bpmnDetails, actionElement, modeling);
  };

  const handleUpdateAction = (actionElement: ModdleElement, newAction: string) => {
    console.log('payload to: updateActionNameOnActionElement', {
      actionElement,
      newAction,
      modeling,
      bpmnDetails,
    });
    updateActionNameOnActionElement(actionElement, newAction, modeling, bpmnDetails);
    setEditMode(false);
  };

  const handleDeleteAction = (actionElement: ModdleElement): void => {
    deleteActionFromTask(bpmnDetails, actionElement, modeling);
  };

  const allowSettingServerAction = (actionName: string): boolean => {
    if (actionName === '') return false; // Ensure that default is not allowing

    const isCustomAction = !getPredefinedActions(bpmnDetails.taskType).includes(actionName);
    const isActionOptional = !isActionRequiredForTask(actionName, bpmnDetails.taskType);

    return isActionOptional && isCustomAction;
  };

  const actionLabel = (actionName = actionElementToEdit.action) =>
    t('process_editor.configuration_panel_actions_action_label', {
      actionIndex: index + 1,
      actionName: actionName,
    });

  return editMode ? (
    <div className={classes.action} key={actionElementToEdit.action}>
      <div className={classes.editActionName}>
        <SelectAction
          actionName={actionElementToEdit.action}
          availablePredefinedActions={availablePredefinedActions}
          comboboxLabel={actionLabel(null)}
          currentActionName={currentActionName}
          onSetCurrentActionName={(actionName: string) => setCurrentActionName(actionName)}
        />
        <StudioButton
          color='success'
          icon={<CheckmarkIcon />}
          onClick={() => handleUpdateAction(actionElementToEdit, currentActionName)}
          disabled={currentActionName === ''}
          size='small'
          title={t('general.save')}
          variant='secondary'
        />
        <StudioDeleteButton
          onDelete={() => handleDeleteAction(actionElementToEdit)}
          size='small'
          title={t('process_editor.configuration_panel_actions_delete_action', {
            actionName: actionElementToEdit.action,
          })}
        />
      </div>
      {allowSettingServerAction(currentActionName) && (
        <div className={classes.editActionType}>
          <Switch
            aria-label={`set_server_type_for_${actionElementToEdit.action}_action`}
            onChange={(checked) => setActionType(actionElementToEdit, checked)}
            size='small'
            value={getTypeForAction(actionElementToEdit) ?? ActionType.Process}
            checked={getTypeForAction(actionElementToEdit) === ActionType.Server}
          >
            {t('process_editor.configuration_panel_actions_set_server_action_label')}
          </Switch>
          <HelpText title={t('process_editor.configuration_panel_actions_action_type_help_text')}>
            {t('process_editor.configuration_panel_actions_set_server_action_info')}
          </HelpText>
        </div>
      )}
    </div>
  ) : (
    <StudioProperty.Button
      aria-label={actionLabel()}
      readOnly={isActionRequiredForTask(actionElementToEdit.action, bpmnDetails.taskType)}
      onClick={() => setEditMode(true)}
      property={actionLabel(null)}
      title={actionLabel()}
      value={actionElementToEdit.action}
      className={classes.action}
    />
  );
};
