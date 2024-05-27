import React from 'react';
/*import classes from './PolicyCardRules.module.css';
import { usePolicyEditorContext } from '../../contexts/PolicyEditorContext';
import { ObjectUtils } from '@studio/pure-functions';
import { ExpandablePolicyCard } from '../ExpandablePolicyCard';
import type { PolicyRuleCard } from '../../types';*/

export type PolicyCardRulesProps = {
  showErrorsOnAllRulesAboveNew: boolean;
};

export const PolicyCardRules = (
  {
    //showErrorsOnAllRulesAboveNew,
  }: PolicyCardRulesProps,
): React.ReactElement => {
  return <div />;
  /*const { policyRules, showAllErrors } = usePolicyEditorContext();

  const handleCloneRule = (index: number) => {
    const ruleToDuplicate: PolicyRuleCard = {
      ...policyRules[index],
      ruleId: getRuleId().toString(),
    };
    const deepCopiedRuleToDuplicate: PolicyRuleCard = ObjectUtils.deepCopy(ruleToDuplicate);

    const updatedRules = [...policyRules, deepCopiedRuleToDuplicate];
    setPolicyRules(updatedRules);
    handleSavePolicy(updatedRules);
  };

  return policyRules.map((pr, i) => {
    return (
      <div className={classes.space} key={pr.ruleId}>
        <ExpandablePolicyCard
          policyRule={pr}
          setPolicyRules={setPolicyRules} // - TODO REMOVE
          resourceId={resourceId ?? ''}
          handleCloneRule={() => handleCloneRule(i)}
          handleDeleteRule={() => {
            setVerificationModalOpen(true);
            setRuleIdToDelete(pr.ruleId);
          }}
          showErrors={
            showAllErrors || (showErrorsOnAllRulesAboveNew && policyRules.length - 1 !== i)
          }
          savePolicy={(rules: PolicyRuleCard[]) => handleSavePolicy(rules)}
        />
      </div>
    );
  });*/
};
