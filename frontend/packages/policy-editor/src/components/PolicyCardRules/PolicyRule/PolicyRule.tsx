import React, { useState, useId } from 'react';
import { ErrorMessage, Textarea } from '@digdir/design-system-react';
import classes from './PolicyRule.module.css';
import { ExpandablePolicyElement } from './ExpandablePolicyElement';
import type { PolicyRuleCard } from '../../../types';
import { getPolicyRuleIdString, getUpdatedRules } from '../../../utils/PolicyRuleUtils';
import { useTranslation } from 'react-i18next';
import { usePolicyEditorContext } from '../../../contexts/PolicyEditorContext';
import { SubResources } from './SubResources';
import { PolicyRuleContextProvider } from '../../../contexts/PolicyRuleContext';
import { PolicyActions } from './PolicyActions';
import { PolicySubjects } from './PolicySubjects';

export type PolicyRuleProps = {
  policyRule: PolicyRuleCard;
  handleCloneRule: () => void;
  handleDeleteRule: () => void;
  showErrors: boolean;
};

export const PolicyRule = ({
  policyRule,
  handleCloneRule,
  handleDeleteRule,
  showErrors,
}: PolicyRuleProps): React.ReactNode => {
  const { t } = useTranslation();

  // FIX BELOW
  const { policyRules, setPolicyRules, savePolicy } = usePolicyEditorContext();

  const uniqueId = useId();

  const [hasResourceError, setHasResourceError] = useState(policyRule.resources.length === 0);

  const [hasActionsError, setHasActionsError] = useState(policyRule.actions.length === 0);
  const [hasSubjectsError, setHasSubjectsError] = useState(policyRule.subject.length === 0);

  const handleChangeDescription = (description: string) => {
    const updatedRules = getUpdatedRules(
      { ...policyRule, description },
      policyRule.ruleId,
      policyRules,
    );
    setPolicyRules(updatedRules);
  };

  // TODO - FIX
  const displayError = (text: string) => {
    return <ErrorMessage size='small'>{text}</ErrorMessage>;
  };

  const getHasRuleError = () => {
    return hasResourceError || hasActionsError || hasSubjectsError;
  };

  const getRuleErrorText = (): string => {
    const arr: string[] = [];
    if (hasResourceError) arr.push(t('policy_editor.policy_rule_missing_sub_resource'));
    if (hasActionsError) arr.push(t('policy_editor.policy_rule_missing_actions'));
    if (hasSubjectsError) arr.push(t('policy_editor.policy_rule_missing_subjects'));

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

  return (
    <PolicyRuleContextProvider
      policyRule={policyRule}
      showAllErrors={showErrors}
      hasResourceError={hasResourceError}
      setHasResourceError={setHasResourceError}
      hasActionsError={hasActionsError}
      setHasActionsError={setHasActionsError}
      uniqueId={uniqueId}
      hasSubjectsError={hasSubjectsError}
      setHasSubjectsError={setHasSubjectsError}
    >
      <div className={classes.cardWrapper}>
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

          <div className={classes.textAreaWrapper}>
            <Textarea
              label={t('policy_editor.rule_card_description_title')}
              size='small'
              value={policyRule.description}
              onChange={(e) => handleChangeDescription(e.currentTarget.value)}
              rows={5}
              onBlur={() => savePolicy(policyRules)}
              id={`description-${uniqueId}`}
              className={classes.descriptionInput}
            />
          </div>
        </ExpandablePolicyElement>
        {showErrors && displayError(getRuleErrorText())}
      </div>
    </PolicyRuleContextProvider>
  );
};
