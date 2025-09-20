import React from 'react';
import classes from './PolicyActions.module.css';
import { getUpdatedRules } from '../../../../utils/PolicyRuleUtils';
import { usePolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import { useTranslation } from 'react-i18next';
import { Label, ErrorMessage, Paragraph, Chip } from '@digdir/designsystemet-react';
import { StudioNativeSelect } from '@studio/components-legacy';

export const PolicyActions = (): React.ReactElement => {
  const { t } = useTranslation();
  const { policyRules: rules, setPolicyRules, actions, savePolicy } = usePolicyEditorContext();
  const { policyRule, uniqueId, showAllErrors, policyError, setPolicyError } =
    usePolicyRuleContext();

  const handleRemoveAction = (actionId: string) => {
    const updatedActions = policyRule.actions.filter((id) => id !== actionId);

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

  const displayActions = policyRule.actions.map((actionId) => {
    const actionTitle = actions.find((a) => a.actionId === actionId).actionTitle;
    return (
      <Chip.Removable
        className={classes.chip}
        key={actionId}
        aria-label={`${t('general.delete')} ${actionTitle}`}
        size='small'
        onClick={() => handleRemoveAction(actionId)}
      >
        {actionTitle}
      </Chip.Removable>
    );
  });

  const isAllActionsSelected = actions.length === policyRule.actions.length;

  return (
    <>
      <Label className={classes.label} size='small' htmlFor={`selectAction-${uniqueId}`}>
        {t('policy_editor.rule_card_actions_title')}
      </Label>
      <Paragraph size='small' className={classes.inputParagraph}>
        {isAllActionsSelected
          ? t('policy_editor.rule_card_actions_select_all_selected')
          : t('policy_editor.rule_card_actions_select_add')}
      </Paragraph>
      <div className={classes.dropdownWrapper}>
        <StudioNativeSelect
          onChange={(event) =>
            event.target.value !== null && handleClickActionInList(event.target.value)
          }
          disabled={isAllActionsSelected}
          error={showAllErrors && policyError.actionsError}
          id={`selectAction-${uniqueId}`}
          size='sm'
          defaultValue=''
        >
          <option value='' hidden></option>
          {actions
            .filter((action) => policyRule.actions.indexOf(action.actionId) === -1)
            .map((option) => (
              <option key={option.actionId} value={option.actionId}>
                {option.actionTitle}
              </option>
            ))}
        </StudioNativeSelect>
      </div>
      <div className={classes.chipWrapper}>{displayActions}</div>
      {showAllErrors && policyError.actionsError && (
        <ErrorMessage size='small'>{t('policy_editor.rule_card_actions_error')}</ErrorMessage>
      )}
    </>
  );
};
