import React from 'react';
import classes from './PolicyEditor.module.css';
import { PolicyEditor as PolicyEditorImpl } from 'app-shared/components/PolicyEditor';
import { Heading, Spinner } from '@digdir/design-system-react';
import { mapPolicyResultToPolicyObject } from 'app-shared/utils/policyEditorUtils';
import {
  PolicyActionType,
  PolicyBackendType,
  PolicySubjectType,
} from 'app-shared/types/PolicyEditorTypes';
import { useResourceAppPolicyQuery } from 'app-development/hooks/queries';
import { useParams } from 'react-router-dom';

/**
 * The different actioons a policy can have. TODO - Find out if there should be more
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
  // TODO - Replace with queries
  const resourceType = 'urn:altinn.resource'; // TODO - Find out if it is fine to hardcode this

  const { org, app } = useParams();
  console.log('org', org);
  console.log('app', app);

  // Get the data
  const { data: policyData, isLoading: policyLoading } = useResourceAppPolicyQuery(org, app);
  console.log(policyData);

  const handleSavePolicy = (p: PolicyBackendType) => {
    console.log('Todo, save policy. Policy: ', p);
  };

  if (policyLoading) {
    return (
      <div className={classes.spinnerrapper}>
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
        policy={mapPolicyResultToPolicyObject(policyData)}
        actions={actionData}
        subjects={dummysubjectData}
        resourceType={resourceType}
        resourceId={'resourceId'} // TODO - Rename and refactor all the way when we know how its gonna be used
        onSave={handleSavePolicy}
        showAllErrors={false} // TODO - Find out how this should be handled for apps, then refactor
      />
    </div>
  );
};
