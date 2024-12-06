import React from 'react';
import classes from './PolicyCardRules.module.css';
import { usePolicyEditorContext } from '../../contexts/PolicyEditorContext';
import { PolicyRule } from './PolicyRule';
import { type PolicyRuleCard } from '../../types';

export type PolicyCardRulesProps = {
  showErrorsOnAllRulesAboveNew: boolean;
};

export const PolicyCardRules = ({
  showErrorsOnAllRulesAboveNew,
}: PolicyCardRulesProps): React.ReactElement[] => {
  const { policyRules, showAllErrors } = usePolicyEditorContext();

  const showErrors = (index: number): boolean =>
    showAllErrors || (showErrorsOnAllRulesAboveNew && policyRules.length - 1 !== index);

  return policyRules.map((policyRuleCard: PolicyRuleCard, index: number) => {
    return (
      <div className={classes.space} key={policyRuleCard.ruleId}>
        <PolicyRule policyRule={policyRuleCard} showErrors={showErrors(index)} ruleIndex={index} />
      </div>
    );
  });
};
