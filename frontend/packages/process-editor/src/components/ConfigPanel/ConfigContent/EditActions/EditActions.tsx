import type { ChangeEvent } from 'react';
import React from 'react';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useTranslation } from 'react-i18next';
import { StudioDeleteButton, StudioProperty } from '@studio/components';
import { Checkbox, Combobox, HelpText } from '@digdir/design-system-react';
import classes from './EditActions.module.css';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import {
  addNewActionToTask,
  deleteActionFromTask,
  filterAvailableActions,
  generateActionName,
  getPredefinedActions,
  getTypeForAction,
  isActionRequiredForTask,
  setActionTypeOnAction,
  updateActionNameOnActionElement,
} from './ActionsUtils';

// Should we do anything with syncing the policy file or just advice to app developer to navigate to policy editor?
// Maybe not in the first implementation round anyway --> new issue

export enum ActionType {
  Server = 'serverAction',
  Process = 'processAction',
}

export const EditActions = () => {
  const { t } = useTranslation();
  const { bpmnDetails, modelerRef } = useBpmnContext();
  const actionElements: ModdleElement[] =
    bpmnDetails?.element?.businessObject?.extensionElements?.values[0]?.actions?.action ?? [];
  const modelerInstance = modelerRef.current;
  const modeling: Modeling = modelerInstance.get('modeling');
  const bpmnFactory: BpmnFactory = modelerInstance.get('bpmnFactory');

  const availablePredefinedActions =
    filterAvailableActions(getPredefinedActions(bpmnDetails.taskType), actionElements) ?? [];

  const setActionType = (actionElement: ModdleElement, checked: ChangeEvent<HTMLInputElement>) => {
    const actionType = checked.target.checked ? ActionType.Server : ActionType.Process;
    setActionTypeOnAction(actionType, bpmnDetails, actionElement, modeling);
  };

  const handleUpdateAction = (actionElement: ModdleElement, newAction: string) => {
    updateActionNameOnActionElement(actionElement, newAction, modeling, bpmnDetails);
  };

  const handleAddNewAction = () => {
    const generatedActionName = generateActionName(
      availablePredefinedActions,
      actionElements,
      bpmnDetails,
    );
    addNewActionToTask(bpmnFactory, modeling, generatedActionName, bpmnDetails);
  };

  const handleDeleteAction = (actionElement: ModdleElement) => {
    deleteActionFromTask(bpmnDetails, actionElement, modeling);
  };

  const allowSettingServerAction = (actionName: string): boolean => {
    return (
      !isActionRequiredForTask(actionName, bpmnDetails) &&
      !getPredefinedActions(bpmnDetails.taskType).includes(actionName)
    );
  };

  return (
    <div className={classes.container}>
      {actionElements.map((actionElement: ModdleElement, index: number) => (
        <div key={index} className={classes.action}>
          <div className={classes.editAction}>
            <Combobox
              label={t('process_editor.configuration_panel_actions_combobox_label')}
              size='small'
              inputValue={actionElement.action}
              readOnly={isActionRequiredForTask(actionElement.action, bpmnDetails)}
              onBlur={({ target }) => handleUpdateAction(actionElement, target.value)}
            >
              <Combobox.Empty>
                {t('process_editor.configuration_panel_actions_custom_action')}
              </Combobox.Empty>
              {availablePredefinedActions.map((predefinedAction: string) => (
                <Combobox.Option key={predefinedAction} value={predefinedAction}>
                  {predefinedAction}
                </Combobox.Option>
              ))}
            </Combobox>
            <StudioDeleteButton
              onDelete={() => handleDeleteAction(actionElement)}
              size='small'
              disabled={isActionRequiredForTask(actionElement.action, bpmnDetails)}
            />
          </div>
          {allowSettingServerAction(actionElement.action) && (
            <div className={classes.actionType}>
              <Checkbox
                aria-label={`set_server_type_for_${actionElement.action}_action`}
                onChange={(checked) => setActionType(actionElement, checked)}
                size='small'
                value={getTypeForAction(actionElement) ?? ActionType.Process}
                checked={getTypeForAction(actionElement) === ActionType.Server}
              >
                {t('process_editor.configuration_panel_actions_set_server_action_check_box')}
              </Checkbox>
              <HelpText
                title={t('process_editor.configuration_panel_actions_action_type_help_text')}
              >
                {t('process_editor.configuration_panel_actions_set_server_action_info')}
              </HelpText>
            </div>
          )}
        </div>
      ))}
      <StudioProperty.Button
        onClick={handleAddNewAction}
        property={t('process_editor.configuration_panel_actions_add_new')}
        size='medium'
      />
    </div>
  );
};
