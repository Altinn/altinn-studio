import React from 'react';
import classes from './PolicyEditorPage.module.css';
import { PolicyBackendType } from 'resourceadm/types/global';
import { useParams } from 'react-router-dom';
import { PolicyEditor } from 'resourceadm/components/PolicyEditor';
import { mapPolicyResultToPolicyObject } from 'resourceadm/utils/mapperUtils';
import { Spinner } from '@digdir/design-system-react';
import {
  useResourcePolicyQuery,
  useResourcePolicyActionsQuery,
  useResourcePolicySubjectsQuery,
} from 'resourceadm/hooks/queries';
import { useResourcePolicyMutation } from 'resourceadm/hooks/mutations';

interface Props {
  showAllErrors: boolean;
}

/**
 * Displays the content where a user can add and edit a policy
 *
 * @param props.showAllErrors flag to decide if all errors should be shown or not
 */
export const PolicyEditorPage = ({ showAllErrors }: Props) => {
  // TODO - translation

  const { resourceId, selectedContext } = useParams();
  const resourceType = 'urn:altinn.resource'; // TODO - Find out if it is fine to hardcode this
  const repo = `${selectedContext}-resources`;

  // Get the data
  const { data: policyData, isLoading: policyLoading } = useResourcePolicyQuery(
    selectedContext,
    repo,
    resourceId
  );
  const { data: actionData, isLoading: actionLoading } = useResourcePolicyActionsQuery(
    selectedContext,
    repo
  );
  const { data: subjectData, isLoading: subjectsLoading } = useResourcePolicySubjectsQuery(
    selectedContext,
    repo
  );

  // Mutation function to update policy
  const { mutate: updatePolicyMutation } = useResourcePolicyMutation(
    selectedContext,
    repo,
    resourceId
  );

  /**
   * Saves the policy to backend
   */
  const handleSavePolicy = (p: PolicyBackendType) => {
    updatePolicyMutation(p);
  };

  /**
   * Displays the content based on the state of the page
   */
  const displayContent = () => {
    if (policyLoading || actionLoading || subjectsLoading) {
      return (
        <div className={classes.spinnerWrapper}>
          <Spinner size='3xLarge' variant='interaction' title='Laster inn policy' />
        </div>
      );
    }
    return (
      <PolicyEditor
        policy={mapPolicyResultToPolicyObject(policyData)}
        actions={actionData}
        subjects={subjectData}
        resourceType={resourceType}
        resourceId={resourceId}
        onSave={handleSavePolicy}
        showAllErrors={showAllErrors}
      />
    );
  };

  return <div className={classes.policyEditorWrapper}>{displayContent()}</div>;
};
