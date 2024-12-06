import React from 'react';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import { useTranslation } from 'react-i18next';
import { ErrorMessage } from '@digdir/designsystemet-react';

export const PolicyRuleErrorMessage = (): React.ReactElement => {
  const { t } = useTranslation();
  const { policyRule, policyError } = usePolicyRuleContext();
  const { resourceError, actionsError, subjectsError } = policyError;

  const getRuleErrorText = (): string => {
    const arr: string[] = [];
    if (resourceError) arr.push(t('policy_editor.policy_rule_missing_sub_resource'));
    if (actionsError) arr.push(t('policy_editor.policy_rule_missing_actions'));
    if (subjectsError) arr.push(t('policy_editor.policy_rule_missing_subjects'));

    if (arr.length === 1) {
      return t('policy_editor.policy_rule_missing_1', {
        ruleId: policyRule.ruleId,
        missing: arr[0],
      });
    }
    if (arr.length === 2) {
      return t('policy_editor.policy_rule_missing_2', {
        ruleId: policyRule.ruleId,
        missing1: arr[0],
        missing2: arr[1],
      });
    }
    if (arr.length === 3) {
      return t('policy_editor.policy_rule_missing_3', {
        ruleId: policyRule.ruleId,
        missing1: arr[0],
        missing2: arr[1],
        missing3: arr[2],
      });
    }
    return '';
  };

  return <ErrorMessage size='small'>{getRuleErrorText()}</ErrorMessage>;
};
