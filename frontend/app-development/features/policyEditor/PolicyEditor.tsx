import React from 'react';
import classes from './PolicyEditor.module.css';
import {
  PolicyEditor as PolicyEditorImpl,
  PolicyActionType,
  PolicyBackendType,
  PolicySubjectType,
} from '@altinn/policy-editor';
import { Heading, Spinner } from '@digdir/design-system-react';
import { useAppPolicyQuery } from 'app-development/hooks/queries';
import { useParams } from 'react-router-dom';
import { useEditAppPolicyMutation } from 'app-development/hooks/mutations';

/**
 * The different actions a policy can have. TODO - Find out if there should be more
 */
const actionData: PolicyActionType[] = [
  { actionId: 'read', actionTitle: 'Les', actionDescription: null },
  { actionId: 'write', actionTitle: 'Skriv', actionDescription: null },
  { actionId: 'delete', actionTitle: 'Slett', actionDescription: null },
  { actionId: 'instantiate', actionTitle: 'Instansier', actionDescription: null },
  { actionId: 'confirm', actionTitle: 'Bekreft', actionDescription: null },
  { actionId: 'complete', actionTitle: 'Fullfør', actionDescription: null },
  { actionId: 'sign', actionTitle: 'Sign', actionDescription: null },
];

/**
 * The different subjects a policy can have. TODO - Find out if there should be more
 */
const dummysubjectData: PolicySubjectType[] = [
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
  const { org, app } = useParams();

  // Get the data
  const { data: policyData, isLoading: policyLoading } = useAppPolicyQuery(org, app);
  console.log(policyData);

  // Mutation function to update policy
  const { mutate: updateAppPolicyMutation } = useEditAppPolicyMutation(org, app);

  /**
   * Saves the policy to backend
   */
  const handleSavePolicy = (p: PolicyBackendType) => {
    updateAppPolicyMutation(p, {
      onSuccess: () => {
        console.log('success');
      },
    });
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
      <PolicyEditorImpl
        policy={policyData}
        actions={actionData}
        subjects={dummysubjectData}
        onSave={handleSavePolicy}
        showAllErrors={false} // TODO - Find out how this should be handled for apps, then refactor
        usageType='app'
      />
    </div>
  );
};
