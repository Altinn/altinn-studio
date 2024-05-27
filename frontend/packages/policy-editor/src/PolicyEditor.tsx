import React, { useState } from 'react';
import { Heading } from '@digdir/design-system-react';
import type {
  PolicyAction,
  Policy,
  PolicyRule,
  PolicyRuleCard,
  PolicyRuleResource,
  PolicySubject,
  RequiredAuthLevel,
  PolicyEditorUsage,
} from './types';
import {
  mapPolicyRulesBackendObjectToPolicyRuleCard,
  emptyPolicyRule,
  mapPolicyRuleToPolicyRuleBackendObject,
  createNewPolicyResource,
} from './utils';
import classes from './PolicyEditor.module.css';
import { CardButton } from './components/CardButton';
import { PolicyEditorAlert } from './components/PolicyEditorAlert';
import { useTranslation } from 'react-i18next';
import { SecurityLevelSelect } from './components/SecurityLevelSelect';
import { ObjectUtils } from '@studio/pure-functions';
import { PolicyEditorContextProvider } from './contexts/PolicyEditorContext';
import { PolicyCardRules } from './components/PolicyCardRules';
import { ExpandablePolicyCard } from './components/ExpandablePolicyCard';

export type PolicyEditorProps = {
  policy: Policy;
  actions: PolicyAction[];
  subjects: PolicySubject[];
  resourceId?: string;
  onSave: (policy: Policy) => void; // MAYBE MOVE TO CONTEXT
  showAllErrors: boolean;
  usageType: PolicyEditorUsage;
};

export const PolicyEditor = ({
  policy,
  actions,
  subjects,
  resourceId,
  onSave,
  showAllErrors,
  usageType,
}: PolicyEditorProps): React.ReactNode => {
  const { t } = useTranslation();

  const resourceType = getResourceType(usageType);

  const [policyRules, setPolicyRules] = useState<PolicyRuleCard[]>(
    mapPolicyRulesBackendObjectToPolicyRuleCard(policy?.rules ?? []),
  );

  const [showErrorsOnAllRulesAboveNew, setShowErrorsOnAllRulesAboveNew] = useState(false);

  // FIX LOGIC
  const displayRules = policyRules.map((pr, i) => {
    return (
      <div className={classes.space} key={pr.ruleId}>
        <ExpandablePolicyCard
          policyRule={pr}
          setPolicyRules={setPolicyRules}
          resourceId={resourceId ?? ''}
          handleCloneRule={() => handleCloneRule(i)}
          handleDeleteRule={() => handleDeleteRule(pr.ruleId)}
          showErrors={
            showAllErrors || (showErrorsOnAllRulesAboveNew && policyRules.length - 1 !== i)
          }
          savePolicy={(rules: PolicyRuleCard[]) => handleSavePolicy(rules)}
        />
      </div>
    );
  });

  const handleCloneRule = (index: number) => {
    const newRuleId: string = getNewRuleId(policyRules);

    const ruleToDuplicate: PolicyRuleCard = {
      ...policyRules[index],
      ruleId: newRuleId,
    };
    const deepCopiedRuleToDuplicate: PolicyRuleCard = ObjectUtils.deepCopy(ruleToDuplicate);

    const updatedRules = [...policyRules, deepCopiedRuleToDuplicate];
    setPolicyRules(updatedRules);
    handleSavePolicy(updatedRules);
  };

  const handleAddCardClick = () => {
    setShowErrorsOnAllRulesAboveNew(true);

    const newResource: PolicyRuleResource[][] = [
      createNewPolicyResource(usageType, resourceType, resourceId),
    ];
    const newRuleId: string = getNewRuleId(policyRules);

    const newRule: PolicyRuleCard = {
      ...emptyPolicyRule,
      ruleId: newRuleId,
      resources: newResource,
    };

    const updatedRules: PolicyRuleCard[] = [...policyRules, ...[newRule]];

    setPolicyRules(updatedRules);
    handleSavePolicy(updatedRules);
  };

  const handleDeleteRule = (ruleIdToDelete: string) => {
    if (confirm(t('policy_editor.verification_modal_text'))) {
      const updatedRules = [...policyRules];
      const indexToRemove = updatedRules.findIndex((a) => a.ruleId === ruleIdToDelete);
      updatedRules.splice(indexToRemove, 1);
      setPolicyRules(updatedRules);

      handleSavePolicy(updatedRules);
    }
  };

  const handleSavePolicy = (rules: PolicyRuleCard[]) => {
    const policyEditorRules: PolicyRule[] = rules.map((pr) =>
      mapPolicyRuleToPolicyRuleBackendObject(
        subjects,
        pr,
        `${resourceType}:${usageType === 'app' ? 'example' : resourceId}:ruleid:${pr.ruleId}`, // TODO - find out if ID should be hardcoded. Issue: #10893
      ),
    );
    onSave({ ...policy, rules: policyEditorRules });
  };

  const handleSavePolicyAuthLevel = (authLevel: RequiredAuthLevel) => {
    onSave({ ...policy, requiredAuthenticationLevelEndUser: authLevel });
  };

  return (
    <PolicyEditorContextProvider
      policyRules={policyRules}
      actions={actions}
      subjects={subjects}
      usageType={usageType}
      resourceType={resourceType}
      showAllErrors={showAllErrors}
    >
      <div>
        <SecurityLevelSelect
          requiredAuthenticationLevelEndUser={policy.requiredAuthenticationLevelEndUser}
          onSave={handleSavePolicyAuthLevel}
        />
        <Heading level={2} size='xxsmall' spacing className={classes.heading}>
          {t('policy_editor.rules')}
        </Heading>
        <div className={classes.alertWrapper}>
          <PolicyEditorAlert />
        </div>
        {displayRules}
        <PolicyCardRules showErrorsOnAllRulesAboveNew={showErrorsOnAllRulesAboveNew} />
        <div className={classes.addCardButtonWrapper}>
          <CardButton
            buttonText={t('policy_editor.card_button_text')}
            onClick={handleAddCardClick}
          />
        </div>
      </div>
    </PolicyEditorContextProvider>
  );
};

// TODO - MOVE BELOW TO SOMEWHERE
// TODO - Find out how this should be set. Issue: #10880
const getResourceType = (usageType: PolicyEditorUsage): string => {
  return usageType === 'app' ? 'urn:altinn' : 'urn:altinn:resource';
};

const getNewRuleId = (rules: PolicyRuleCard[]): string => {
  const lastId: number = Number(rules[rules.length - 1].ruleId) + 1;
  return String(lastId);
};
