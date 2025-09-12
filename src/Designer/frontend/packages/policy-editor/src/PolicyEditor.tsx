import React, { useState } from 'react';
import { Heading } from '@digdir/designsystemet-react';
import type {
  PolicyAction,
  Policy,
  PolicyRule,
  PolicyRuleCard,
  PolicySubject,
  RequiredAuthLevel,
  PolicyEditorUsage,
} from './types';
import {
  mapPolicyRulesBackendObjectToPolicyRuleCard,
  mapPolicyRuleToPolicyRuleBackendObject,
} from './utils';
import classes from './PolicyEditor.module.css';
import { PolicyEditorAlert } from './components/PolicyEditorAlert';
import { useTranslation } from 'react-i18next';
import { SecurityLevelSelect } from './components/SecurityLevelSelect';
import { PolicyEditorContextProvider } from './contexts/PolicyEditorContext';
import type { PolicyAccessPackageAreaGroup } from 'app-shared/types/PolicyAccessPackages';
import { PolicyRulesEditor } from './components/PolicyRulesEditor';
import { PolicyEditorTabs } from './components/PolicyEditorTabs';
import { ConsentResourcePolicyRulesEditor } from './components/ConsentResourcePolicyRulesEditor';

export type PolicyEditorProps = {
  policy: Policy;
  actions: PolicyAction[];
  subjects: PolicySubject[];
  accessPackages?: PolicyAccessPackageAreaGroup[];
  resourceId?: string;
  onSave: (policy: Policy) => void; // MAYBE MOVE TO CONTEXT
  showAllErrors: boolean;
  usageType: PolicyEditorUsage;
  isConsentResource?: boolean;
};

export const PolicyEditor = ({
  policy,
  actions,
  subjects,
  accessPackages,
  resourceId,
  onSave,
  showAllErrors,
  usageType,
  isConsentResource,
}: PolicyEditorProps): React.ReactNode => {
  const { t } = useTranslation();

  const resourceType = getResourceType(usageType);

  const [policyRules, setPolicyRules] = useState<PolicyRuleCard[]>(
    mapPolicyRulesBackendObjectToPolicyRuleCard(policy?.rules ?? []),
  );

  const handleSavePolicy = (rules: PolicyRuleCard[]) => {
    const policyEditorRules: PolicyRule[] = rules.map((pr) =>
      mapPolicyRuleToPolicyRuleBackendObject(
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
      setPolicyRules={setPolicyRules}
      actions={actions}
      subjects={subjects}
      accessPackages={accessPackages ?? []}
      usageType={usageType}
      resourceType={resourceType}
      showAllErrors={showAllErrors}
      resourceId={resourceId ?? ''}
      savePolicy={handleSavePolicy}
    >
      <div className={classes.policyEditor}>
        <SecurityLevelSelect
          requiredAuthenticationLevelEndUser={policy.requiredAuthenticationLevelEndUser}
          onSave={handleSavePolicyAuthLevel}
        />
        <Heading level={4} size='xxsmall' className={classes.heading}>
          {t('policy_editor.rules')}
        </Heading>
        <div className={classes.alertWrapper}>
          <PolicyEditorAlert />
        </div>
        <PolicyEditorContent usageType={usageType} isConsentResource={isConsentResource} />
      </div>
    </PolicyEditorContextProvider>
  );
};

type PolicyEditorContentProps = {
  usageType: PolicyEditorUsage;
  isConsentResource?: boolean;
};

function PolicyEditorContent({
  usageType,
  isConsentResource,
}: PolicyEditorContentProps): React.ReactElement {
  if (usageType === 'app') {
    return <PolicyEditorTabs />;
  } else if (isConsentResource) {
    return <ConsentResourcePolicyRulesEditor />;
  }
  return <PolicyRulesEditor />;
}

// TODO - Find out how this should be set. Issue: #10880
const getResourceType = (usageType: PolicyEditorUsage): string => {
  return usageType === 'app' ? 'urn:altinn' : 'urn:altinn:resource';
};
