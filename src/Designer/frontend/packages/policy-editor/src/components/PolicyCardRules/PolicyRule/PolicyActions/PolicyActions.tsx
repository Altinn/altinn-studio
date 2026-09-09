import React from 'react';
import classes from './PolicyActions.module.css';
import { getActionOptions, getUpdatedRules } from '../../../../utils/PolicyRuleUtils';
import { usePolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import { useTranslation } from 'react-i18next';
import { StudioSuggestion } from '@studio/components';
import type { StudioSuggestionItem } from '@studio/components';
import type { PolicyAction } from '../../../../types';

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

  const actionOptions = getActionOptions(actions, policyRule);

  const getTranslationByActionId = (actionId: string): string => {
    return wellKnownActionsIds.includes(actionId)
      ? t(`policy_editor.action_${actionId}`)
      : actionId;
  };

  const saveActions = (updatedActions: string[]): void => {
    const updatedRules = getUpdatedRules(
      { ...policyRule, actions: updatedActions },
      policyRule.ruleId,
      rules,
    );
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
    setPolicyError({ ...policyError, actionsError: updatedActions.length === 0 });
  };

  const handleSelectedActionsChange = (items: StudioSuggestionItem[]): void => {
    const updatedActions: string[] = items.map((item) => item.value);
    saveActions(updatedActions);
  };

  const selectedActions: StudioSuggestionItem[] = policyRule.actions.map((actionId: string) => ({
    value: actionId,
    label: getTranslationByActionId(actionId),
  }));

  const description =
    actionOptions.length === 0
      ? t('policy_editor.rule_card_actions_select_all_selected')
      : t('policy_editor.rule_card_actions_select_add');

  const error =
    showAllErrors && policyError.actionsError ? t('policy_editor.rule_card_actions_error') : false;

  return (
    <StudioSuggestion
      multiple
      className={classes.dropdownWrapper}
      label={t('policy_editor.rule_card_actions_title')}
      description={description}
      emptyText={t('general.no_options')}
      error={error}
      id={`suggestAction-${uniqueId}`}
      selected={selectedActions}
      onSelectedChange={handleSelectedActionsChange}
    >
      {actions.map((action: PolicyAction) => (
        <StudioSuggestion.Option
          key={action.actionId}
          value={action.actionId}
          label={getTranslationByActionId(action.actionId)}
        >
          {getTranslationByActionId(action.actionId)}
        </StudioSuggestion.Option>
      ))}
    </StudioSuggestion>
  );
};
