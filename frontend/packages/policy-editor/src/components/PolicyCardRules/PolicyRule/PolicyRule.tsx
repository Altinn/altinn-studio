import React, { useState, useId } from 'react';
import { ExpandablePolicyElement } from './ExpandablePolicyElement';
import type { PolicyRuleCard, PolicyError } from '../../../types';
import { getPolicyRuleIdString } from '../../../utils/PolicyRuleUtils';
import { useTranslation } from 'react-i18next';
import { SubResources } from './SubResources';
import { PolicyRuleContextProvider } from '../../../contexts/PolicyRuleContext';
import { PolicyActions } from './PolicyActions';
import { PolicySubjects } from './PolicySubjects';
import { PolicyDescription } from './PolicyDescription';
import { PolicyRuleErrorMessage } from './PolicyRuleErrorMessage';
import { getNewRuleId } from '../../../utils';
import { usePolicyEditorContext } from '../../../contexts/PolicyEditorContext';
import { ObjectUtils } from '@studio/pure-functions';

export type PolicyRuleProps = {
  policyRule: PolicyRuleCard;
  showErrors: boolean;
  ruleIndex: number;
};

export const PolicyRule = ({
  policyRule,
  showErrors,
  ruleIndex,
}: PolicyRuleProps): React.ReactNode => {
  const { t } = useTranslation();
  const { policyRules, setPolicyRules, savePolicy } = usePolicyEditorContext();

  const uniqueId = useId();

  const [policyError, setPolicyError] = useState<PolicyError>({
    resourceError: policyRule.resources.length === 0,
    actionsError: policyRule.actions.length === 0,
    subjectsError: policyRule.subject.length === 0,
  });
  const { resourceError, actionsError, subjectsError } = policyError;

  const getHasRuleError = () => {
    return resourceError || actionsError || subjectsError;
  };

  const handleCloneRule = () => {
    const newRuleId: string = getNewRuleId(policyRules);

    const ruleToDuplicate: PolicyRuleCard = {
      ...policyRules[ruleIndex],
      ruleId: newRuleId,
    };
    const deepCopiedRuleToDuplicate: PolicyRuleCard = ObjectUtils.deepCopy(ruleToDuplicate);

    const updatedRules = [...policyRules, deepCopiedRuleToDuplicate];
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
  };

  const handleDeleteRule = () => {
    if (confirm(t('policy_editor.verification_modal_text'))) {
      const updatedRules = [...policyRules];
      const indexToRemove = updatedRules.findIndex((a) => a.ruleId === policyRule.ruleId);
      updatedRules.splice(indexToRemove, 1);
      setPolicyRules(updatedRules);
      savePolicy(updatedRules);
    }
  };

  return (
    <PolicyRuleContextProvider
      policyRule={policyRule}
      showAllErrors={showErrors}
      uniqueId={uniqueId}
      policyError={policyError}
      setPolicyError={setPolicyError}
    >
      <div>
        <ExpandablePolicyElement
          title={`${t('policy_editor.rule')} ${getPolicyRuleIdString(policyRule)}`}
          isCard
          handleCloneElement={handleCloneRule}
          handleRemoveElement={handleDeleteRule}
          hasError={showErrors && getHasRuleError()}
        >
          <SubResources />
          <PolicyActions />
          <PolicySubjects />
          <PolicyDescription />
        </ExpandablePolicyElement>
        {showErrors && <PolicyRuleErrorMessage />}
      </div>
    </PolicyRuleContextProvider>
  );
};
