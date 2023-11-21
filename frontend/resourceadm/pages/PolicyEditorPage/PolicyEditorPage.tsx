import React from 'react';
import classes from './PolicyEditorPage.module.css';
import { useParams } from 'react-router-dom';
import { PolicyEditor } from '@altinn/policy-editor';
import type { Policy } from '@altinn/policy-editor';
import { Spinner, Heading } from '@digdir/design-system-react';
import { useResourcePolicyQuery } from 'resourceadm/hooks/queries';
import { useEditResourcePolicyMutation } from 'resourceadm/hooks/mutations';
import { useTranslation } from 'react-i18next';
import {
  useResourcePolicyActionsQuery,
  useResourcePolicySubjectsQuery,
} from 'app-shared/hooks/queries';

export type PolicyEditorPageProps = {
  showAllErrors: boolean;
  id: string;
};

/**
 * @component
 *    Page that displays the content where a user can add and edit a policy
 *
 * @property {boolean}[showAllErrors] - Flag to decide if all errors should be shown or not
 * @property {string}[id] - The id of the page
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const PolicyEditorPage = ({ showAllErrors, id }: PolicyEditorPageProps): React.ReactNode => {
  const { t } = useTranslation();

  const { resourceId, org: selectedContext } = useParams();
  const repo = `${selectedContext}-resources`;

  // Get the data
  const { data: policyData, isPending: isPolicyPending } = useResourcePolicyQuery(
    selectedContext,
    repo,
    resourceId,
  );
  const { data: actionData, isPending: isActionPending } = useResourcePolicyActionsQuery(
    selectedContext,
    repo,
  );
  const { data: subjectData, isPending: isSubjectsPending } = useResourcePolicySubjectsQuery(
    selectedContext,
    repo,
  );

  // Mutation function to update policy
  const { mutate: updatePolicyMutation } = useEditResourcePolicyMutation(
    selectedContext,
    repo,
    resourceId,
  );

  /**
   * Saves the policy to backend
   */
  const handleSavePolicy = (policy: Policy) => {
    updatePolicyMutation(policy, {
      onSuccess: () => {
        console.log('success');
      },
    });
  };

  /**
   * Displays the content based on the state of the page
   */
  const displayContent = () => {
    if (isPolicyPending || isActionPending || isSubjectsPending) {
      return (
        <div className={classes.spinnerWrapper}>
          <Spinner
            size='xlarge'
            variant='interaction'
            title={t('resourceadm.policy_editor_spinner')}
          />
        </div>
      );
    }
    return (
      <PolicyEditor
        policy={policyData}
        actions={actionData}
        subjects={subjectData}
        resourceId={resourceId}
        onSave={handleSavePolicy}
        showAllErrors={showAllErrors}
        usageType='resource'
      />
    );
  };

  return (
    <div className={classes.policyEditorWrapper} id={id} role='tabpanel'>
      <Heading size='large' spacing level={1}>
        {t('resourceadm.policy_editor_title')}
      </Heading>
      {displayContent()}
    </div>
  );
};
