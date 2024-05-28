import React, { useState } from 'react';
import classes from './PolicyActions.module.css';
import { getActionOptions, getUpdatedRules } from '../../../../utils/PolicyRuleUtils';
import { usePolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import { useTranslation } from 'react-i18next';
import { Label, ErrorMessage, Paragraph, LegacySelect, Chip } from '@digdir/design-system-react';

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
  const { policyRule, uniqueId, showAllErrors, hasActionsError, setHasActionsError } =
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
    setHasActionsError(updatedActions.length === 0);
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
    setHasActionsError(false);
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

  return (
    <>
      <Label className={classes.label} size='small' htmlFor={`selectAction-${uniqueId}`}>
        {t('policy_editor.rule_card_actions_title')}
      </Label>
      <Paragraph size='small' className={classes.inputParagraph}>
        {actionOptions.length === 0
          ? t('policy_editor.rule_card_actions_select_all_selected')
          : t('policy_editor.rule_card_actions_select_add')}
      </Paragraph>
      <div className={classes.dropdownWrapper}>
        <LegacySelect
          options={actionOptions.map((option) => ({
            ...option,
            label: getTranslationByActionId(option.label),
          }))}
          onChange={(value: string) => value !== null && handleClickActionInList(value)}
          disabled={actionOptions.length === 0}
          error={showAllErrors && hasActionsError}
          inputId={`selectAction-${uniqueId}`}
        />
      </div>
      <div className={classes.chipWrapper}>{displayActions}</div>
      {showAllErrors && hasActionsError && (
        <ErrorMessage size='small'>{t('policy_editor.rule_card_actions_error')}</ErrorMessage>
      )}
    </>
  );
};
