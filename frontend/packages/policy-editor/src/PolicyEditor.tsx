import React, { useState } from 'react';
import { Alert, Heading, Paragraph } from '@digdir/design-system-react';
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
import { VerificationModal } from './components/VerificationModal';
import { ExpandablePolicyCard } from './components/ExpandablePolicyCard';
import { CardButton } from './components/CardButton';
import { ObjectUtils } from '@studio/pure-functions';
import { useTranslation } from 'react-i18next';
import { SecurityLevelSelect } from './components/SecurityLevelSelect';
import { PolicyEditorContextProvider } from './contexts/PolicyEditorContext';

export type PolicyEditorProps = {
  policy: Policy;
  actions: PolicyAction[];
  subjects: PolicySubject[];
  resourceId?: string;
  onSave: (policy: Policy) => void;
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

  // MOVE TO CONTEXT?
  // TODO - Find out how this should be set. Issue: #10880
  const resourceType = usageType === 'app' ? 'urn:altinn' : 'urn:altinn:resource';

  const [policyRules, setPolicyRules] = useState<PolicyRuleCard[]>(
    mapPolicyRulesBackendObjectToPolicyRuleCard(policy?.rules ?? []),
  );

  // Handle the new updated IDs of the rules when a rule is deleted / duplicated
  const [lastRuleId, setLastRuleId] = useState((policy?.rules?.length ?? 0) + 1);

  const [verificationModalOpen, setVerificationModalOpen] = useState(false);

  // To keep track of which rule to delete
  const [ruleIdToDelete, setRuleIdToDelete] = useState('0');
  const [showErrorsOnAllRulesAboveNew, setShowErrorsOnAllRulesAboveNew] = useState(false);

  const displayRules = policyRules.map((pr, i) => {
    return (
      <div className={classes.space} key={pr.ruleId}>
        <ExpandablePolicyCard
          policyRule={pr}
          setPolicyRules={setPolicyRules}
          resourceId={resourceId ?? ''}
          resourceType={resourceType}
          handleCloneRule={() => handleCloneRule(i)}
          handleDeleteRule={() => {
            setVerificationModalOpen(true);
            setRuleIdToDelete(pr.ruleId);
          }}
          showErrors={
            showAllErrors || (showErrorsOnAllRulesAboveNew && policyRules.length - 1 !== i)
          }
          savePolicy={(rules: PolicyRuleCard[]) => handleSavePolicy(rules)}
          usageType={usageType}
        />
      </div>
    );
  });

  const getRuleId = () => {
    const idTaken: boolean = policyRules.map((p) => p.ruleId).includes(lastRuleId.toString());

    const currentRuleId = idTaken ? lastRuleId + 1 : lastRuleId;
    setLastRuleId(currentRuleId + 1);
    return currentRuleId;
  };

  const handleAddCardClick = () => {
    setShowErrorsOnAllRulesAboveNew(true);

    const newResource: PolicyRuleResource[][] = [
      createNewPolicyResource(usageType, resourceType, resourceId),
    ];

    const newRule: PolicyRuleCard = {
      ...emptyPolicyRule,
      ruleId: getRuleId().toString(),
      resources: newResource,
    };

    const updatedRules: PolicyRuleCard[] = [...policyRules, ...[newRule]];

    setPolicyRules(updatedRules);
    handleSavePolicy(updatedRules);
  };

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

  const handleDeleteRule = (ruleId: string) => {
    const updatedRules = [...policyRules];
    const indexToRemove = updatedRules.findIndex((a) => a.ruleId === ruleId);
    updatedRules.splice(indexToRemove, 1);
    setPolicyRules(updatedRules);

    setVerificationModalOpen(false);
    setRuleIdToDelete('0');

    handleSavePolicy(updatedRules);
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
    <PolicyEditorContextProvider policyRules={policyRules} actions={actions} subjects={subjects}>
      <div>
        <SecurityLevelSelect
          requiredAuthenticationLevelEndUser={policy.requiredAuthenticationLevelEndUser}
          onSave={handleSavePolicyAuthLevel}
        />
        <Heading level={2} size='xxsmall' spacing className={classes.heading}>
          {t('policy_editor.rules')}
        </Heading>
        <div className={classes.alertWrapper}>
          <Alert severity='info' className={classes.alert}>
            <Paragraph size='small'>
              {t('policy_editor.alert', {
                usageType:
                  usageType === 'app'
                    ? t('policy_editor.alert_app')
                    : t('policy_editor.alert_resource'),
              })}
            </Paragraph>
          </Alert>
        </div>
        {displayRules}
        <div className={classes.addCardButtonWrapper}>
          <CardButton
            buttonText={t('policy_editor.card_button_text')}
            onClick={handleAddCardClick}
          />
        </div>
        <VerificationModal
          isOpen={verificationModalOpen}
          onClose={() => setVerificationModalOpen(false)}
          text={t('policy_editor.verification_modal_text')}
          closeButtonText={t('policy_editor.verification_modal_close_button')}
          actionButtonText={t('policy_editor.verification_modal_action_button')}
          onPerformAction={() => handleDeleteRule(ruleIdToDelete)}
        />
      </div>
    </PolicyEditorContextProvider>
  );
};
