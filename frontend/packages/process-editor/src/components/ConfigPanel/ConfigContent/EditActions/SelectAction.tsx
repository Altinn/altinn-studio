import React from 'react';
import { Combobox } from '@digdir/design-system-react';
import classes from './SelectAction.module.css';
import { useTranslation } from 'react-i18next';

export interface SelectActionProps {
  actionName: string;
  availablePredefinedActions: string[];
  comboboxLabel: string;
  currentActionName: string;
  onSetCurrentActionName: (actionName: string) => void;
}

export const SelectAction = ({
  actionName,
  availablePredefinedActions,
  comboboxLabel,
  currentActionName,
  onSetCurrentActionName,
}: SelectActionProps) => {
  const { t } = useTranslation();

  const allPredefinedActions = ['write', 'reject', 'confirm', 'sign'];

  return (
    <Combobox
      className={classes.actionCombobox}
      title={`combobox_${actionName}`}
      label={comboboxLabel}
      description={t('process_editor.configuration_panel_actions_combobox_description')}
      size='small'
      value={
        availablePredefinedActions.includes(currentActionName) ||
        allPredefinedActions.includes(actionName)
          ? [currentActionName]
          : []
      }
      onBlur={({ target }) => onSetCurrentActionName(target.value)}
    >
      <Combobox.Empty>
        {t('process_editor.configuration_panel_actions_custom_action')}
      </Combobox.Empty>
      {allPredefinedActions.includes(actionName) && (
        <Combobox.Option key={actionName} value={actionName}>
          {actionName}
        </Combobox.Option>
      )}
      {availablePredefinedActions.map((predefinedAction: string) => (
        <Combobox.Option
          key={predefinedAction}
          value={predefinedAction}
          displayValue={predefinedAction}
        >
          {predefinedAction}
        </Combobox.Option>
      ))}
    </Combobox>
  );
};
