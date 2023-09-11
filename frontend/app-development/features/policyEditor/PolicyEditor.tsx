import React from 'react';
import classes from './PolicyEditor.module.css';
import { PolicyEditor as PolicyEditorImpl } from '@altinn/policy-editor';
import type { PolicyAction, Policy, PolicySubject } from '@altinn/policy-editor';
import { Heading, Spinner } from '@digdir/design-system-react';
import { useAppPolicyQuery } from 'app-development/hooks/queries';
import { useAppPolicyMutation } from 'app-development/hooks/mutations';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { SettingsModal } from './SettingsModal';

/**
 * The different actions a policy can have. TODO - Find out if there should be more.
 * Issue: #10882
 */
const actionData: PolicyAction[] = [
  { actionId: 'read', actionTitle: 'Les', actionDescription: null },
  { actionId: 'write', actionTitle: 'Skriv', actionDescription: null },
  { actionId: 'delete', actionTitle: 'Slett', actionDescription: null },
  {
    actionId: 'instantiate',
    actionTitle: 'Instansier',
    actionDescription: null,
  },
  { actionId: 'confirm', actionTitle: 'Bekreft', actionDescription: null },
  { actionId: 'complete', actionTitle: 'Fullfør', actionDescription: null },
  { actionId: 'sign', actionTitle: 'Sign', actionDescription: null },
];

/**
 * The different subjects a policy can have. TODO - Find out if there should be more.
 * Issue: #10882
 */
const subjectData: PolicySubject[] = [
  {
    subjectDescription: 'Daglig leder fra enhetsregisteret',
    subjectId: 'DAGL',
    subjectSource: 'altinn:rolecode',
    subjectTitle: 'Daglig leder',
  },
  {
    subjectDescription: 'Regnskapsfører',
    subjectId: 'REGNA',
    subjectSource: 'altinn:rolecode',
    subjectTitle: 'Regnskapsfører',
  },
  {
    subjectDescription: '[ORG] - TODO',
    subjectId: '[ORG]',
    subjectSource: '[ORG]',
    subjectTitle: '[ORG]',
  },
  {
    subjectDescription: 'Subject 4',
    subjectId: 'sub4',
    subjectSource: 'altinn:rolecode',
    subjectTitle: 'Subject 4',
  },
];

export const PolicyEditor = () => {
  const { org, app } = useStudioUrlParams();

  // Get the data
  const { data: policyData, isLoading: policyLoading } = useAppPolicyQuery(org, app);

  // Mutation function to update policy
  const { mutate: updateAppPolicyMutation } = useAppPolicyMutation(org, app);

  /**
   * Saves the policy to backend
   */
  const handleSavePolicy = (policy: Policy) => {
    updateAppPolicyMutation(policy);
  };

  if (policyLoading) {
    return (
      <div className={classes.spinnerWrapper}>
        <Spinner size='2xLarge' variant='interaction' title='Laster inn policy' />
      </div>
    );
  }
  return (
    <div className={classes.policyEditorWrapper}>
      <Heading size='large' spacing level={1}>
        Tilgangsregler
      </Heading>
      {/* TODO - Move button to the correct place to open the settings modal from. Issue: #11047 */}
      <SettingsModal />
      <PolicyEditorImpl
        policy={policyData}
        actions={actionData}
        // TODO - Find out the list of subjects: Issue: #10882
        subjects={subjectData}
        onSave={handleSavePolicy}
        // TODO - Find out how errors should be handled for apps, then refactor. Issue: #10881
        showAllErrors={false}
        usageType='app'
      />
    </div>
  );
};
