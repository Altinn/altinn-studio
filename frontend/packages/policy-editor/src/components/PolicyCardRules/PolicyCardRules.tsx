import React from 'react';
import classes from './PolicyCardRules.module.css';
import { usePolicyEditorContext } from '../../contexts/PolicyEditorContext';
import { PolicyRule } from './PolicyRule';

export type PolicyCardRulesProps = {
  showErrorsOnAllRulesAboveNew: boolean;
};

export const PolicyCardRules = ({
  showErrorsOnAllRulesAboveNew,
}: PolicyCardRulesProps): React.ReactElement[] => {
  const { policyRules, showAllErrors } = usePolicyEditorContext();

  return policyRules.map((pr, i) => {
    return (
      <div className={classes.space} key={pr.ruleId}>
        <PolicyRule
          policyRule={pr}
          showErrors={
            showAllErrors || (showErrorsOnAllRulesAboveNew && policyRules.length - 1 !== i)
          }
          ruleIndex={i}
        />
      </div>
    );
  });
};
