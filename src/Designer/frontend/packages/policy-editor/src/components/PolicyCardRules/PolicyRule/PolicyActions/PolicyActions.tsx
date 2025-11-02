import React, { useState } from 'react';
import classes from './PolicyActions.module.css';
import { getActionOptions, getUpdatedRules } from '../../../../utils/PolicyRuleUtils';
import { usePolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import { useTranslation } from 'react-i18next';
import { Chip } from '@digdir/designsystemet-react';
import { StudioSelect } from '@studio/components';

const wellKnownActionsIds: string[] = [
  'complete',
  'confirm',
  'delete',
  'instantiate',
  'read',
  'sign',
  'write',
];

export const PolicyActions = (): React.ReactElement => {
  const { t } = useTranslation();
  const { policyRules: rules, setPolicyRules, actions, savePolicy } = usePolicyEditorContext();
  const { policyRule, uniqueId, showAllErrors, policyError, setPolicyError } =
    usePolicyRuleContext();

  const [actionOptions, setActionOptions] = useState(getActionOptions(actions, policyRule));

  const getTranslationByActionId = (actionId: string): string => {
    return wellKnownActionsIds.includes(actionId)
      ? t(`policy_editor.action_${actionId}`)
      : actionId;
  };

  const handleRemoveAction = (index: number, actionTitle: string) => {
    const updatedActions = [...policyRule.actions];
    updatedActions.splice(index, 1);

    setActionOptions([...actionOptions, { value: actionTitle, label: actionTitle }]);

    const updatedRules = getUpdatedRules(
      { ...policyRule, actions: updatedActions },
      policyRule.ruleId,
      rules,
    );
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
    setPolicyError({ ...policyError, actionsError: updatedActions.length === 0 });
  };

  const handleClickActionInList = (clickedOption: string) => {
    const index = actionOptions.findIndex((o) => o.value === clickedOption);
    const updatedOptions = [...actionOptions];
    updatedOptions.splice(index, 1);
    setActionOptions(updatedOptions);

    const updatedActionTitles = [...policyRule.actions, clickedOption];
    const updatedRules = getUpdatedRules(
      { ...policyRule, actions: updatedActionTitles },
      policyRule.ruleId,
      rules,
    );
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
    setPolicyError({ ...policyError, actionsError: false });
  };

  const displayActions = policyRule.actions.map((actionId, i) => {
    return (
      <Chip.Removable
        className={classes.chip}
        key={actionId}
        aria-label={`${t('general.delete')} ${getTranslationByActionId(actionId)}`}
        size='small'
        onClick={() => handleRemoveAction(i, actionId)}
      >
        {getTranslationByActionId(actionId)}
      </Chip.Removable>
    );
  });

  const description =
    actionOptions.length === 0
      ? t('policy_editor.rule_card_actions_select_all_selected')
      : t('policy_editor.rule_card_actions_select_add');

  const error =
    showAllErrors && policyError.actionsError ? t('policy_editor.rule_card_actions_error') : false;

  return (
    <>
      <div className={classes.dropdownWrapper}>
        <StudioSelect
          label={t('policy_editor.rule_card_actions_title')}
          description={description}
          onChange={(event) =>
            event.target.value !== null && handleClickActionInList(event.target.value)
          }
          disabled={actionOptions.length === 0}
          error={error}
          id={`selectAction-${uniqueId}`}
          defaultValue=''
        >
          <option value='' hidden></option>
          {actionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {getTranslationByActionId(option.label)}
            </option>
          ))}
        </StudioSelect>
      </div>
      <div className={classes.chipWrapper}>{displayActions}</div>
    </>
  );
};
