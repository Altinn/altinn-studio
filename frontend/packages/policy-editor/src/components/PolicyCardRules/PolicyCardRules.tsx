import React from 'react';
import classes from './PolicyCardRules.module.css';
import { usePolicyEditorContext } from '../../contexts/PolicyEditorContext';
import { ObjectUtils } from '@studio/pure-functions';
import { PolicyRule } from './PolicyRule';
import type { PolicyRuleCard } from '../../types';
import { getNewRuleId } from '../../utils';
import { useTranslation } from 'react-i18next';

export type PolicyCardRulesProps = {
  showErrorsOnAllRulesAboveNew: boolean;
};

export const PolicyCardRules = ({
  showErrorsOnAllRulesAboveNew,
}: PolicyCardRulesProps): React.ReactElement[] => {
  const { policyRules, setPolicyRules, showAllErrors, savePolicy } = usePolicyEditorContext();
  const { t } = useTranslation();

  const handleCloneRule = (index: number) => {
    const newRuleId: string = getNewRuleId(policyRules);

    const ruleToDuplicate: PolicyRuleCard = {
      ...policyRules[index],
      ruleId: newRuleId,
    };
    const deepCopiedRuleToDuplicate: PolicyRuleCard = ObjectUtils.deepCopy(ruleToDuplicate);

    const updatedRules = [...policyRules, deepCopiedRuleToDuplicate];
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
  };

  const handleDeleteRule = (ruleIdToDelete: string) => {
    if (confirm(t('policy_editor.verification_modal_text'))) {
      const updatedRules = [...policyRules];
      const indexToRemove = updatedRules.findIndex((a) => a.ruleId === ruleIdToDelete);
      updatedRules.splice(indexToRemove, 1);
      setPolicyRules(updatedRules);

      savePolicy(updatedRules);
    }
  };

  return policyRules.map((pr, i) => {
    return (
      <div className={classes.space} key={pr.ruleId}>
        <PolicyRule
          policyRule={pr}
          handleCloneRule={() => handleCloneRule(i)}
          handleDeleteRule={() => handleDeleteRule(pr.ruleId)}
          showErrors={
            showAllErrors || (showErrorsOnAllRulesAboveNew && policyRules.length - 1 !== i)
          }
        />
      </div>
    );
  });
};
