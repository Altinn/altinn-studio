import React from 'react';
import classes from './PolicyEditorPage.module.css';
import {
  PolicyEditor,
  mergeActionsFromPolicyWithActionOptions,
  mergeSubjectsFromPolicyWithSubjectOptions,
} from '@altinn/policy-editor';
import type { Policy } from '@altinn/policy-editor';
import { StudioSpinner, StudioHeading } from '@studio/components';
import { useResourcePolicyQuery, useSinlgeResourceQuery } from '../../hooks/queries';
import { useEditResourcePolicyMutation } from '../../hooks/mutations';
import { useTranslation } from 'react-i18next';
import {
  useResourcePolicyActionsQuery,
  useResourcePolicySubjectsQuery,
  useResourceAccessPackagesQuery,
} from 'app-shared/hooks/queries';
import { useUrlParams } from '../../hooks/useUrlParams';
import { useGetAllAccessListsQuery } from '../../hooks/queries/useGetAllAccessListsQuery';
import { getResourcePolicyRules, getResourceSubjects } from '../../utils/resourceUtils';

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
 * @returns {React.JSX.Element} - The rendered component
 */
export const PolicyEditorPage = ({
  showAllErrors,
  id,
}: PolicyEditorPageProps): React.JSX.Element => {
  const { t } = useTranslation();

  const { resourceId, org, app } = useUrlParams();

  // Get the data
  const { data: policyData, isPending: isPolicyPending } = useResourcePolicyQuery(
    org,
    app,
    resourceId,
  );
  const { data: resourceData, isPending: isLoadingResource } = useSinlgeResourceQuery(
    org,
    app,
    resourceId,
  );
  const isConsentResource = resourceData?.resourceType === 'Consent';
  const { data: accessLists, isPending: isLoadingAccessLists } = useGetAllAccessListsQuery(
    org,
    isConsentResource,
  );
  const { data: actionData, isPending: isActionPending } = useResourcePolicyActionsQuery(org, app);
  const { data: subjectData, isPending: isSubjectsPending } = useResourcePolicySubjectsQuery(
    org,
    app,
  );
  const { data: accessPackages, isPending: isLoadingAccessPackages } =
    useResourceAccessPackagesQuery(org, app);

  // Mutation function to update policy
  const { mutate: updatePolicyMutation } = useEditResourcePolicyMutation(org, app, resourceId);

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
    if (
      isPolicyPending ||
      isActionPending ||
      isSubjectsPending ||
      isLoadingAccessPackages ||
      isLoadingResource ||
      (isConsentResource && isLoadingAccessLists)
    ) {
      return (
        <div className={classes.spinnerWrapper}>
          <StudioSpinner data-size='xl' aria-label={t('resourceadm.policy_editor_spinner')} />
        </div>
      );
    }

    const mergedActions = mergeActionsFromPolicyWithActionOptions(policyData.rules, actionData);
    const subjects = getResourceSubjects(accessLists, subjectData, org, isConsentResource);
    const mergedSubjects = mergeSubjectsFromPolicyWithSubjectOptions(policyData.rules, subjects);
    const policy = getResourcePolicyRules(policyData, resourceId, isConsentResource);

    return (
      <PolicyEditor
        policy={policy}
        actions={mergedActions}
        subjects={mergedSubjects}
        accessPackages={accessPackages}
        resourceId={resourceId}
        onSave={handleSavePolicy}
        showAllErrors={showAllErrors}
        usageType='resource'
        isConsentResource={isConsentResource}
      />
    );
  };

  return (
    <div className={classes.policyEditorWrapper} id={id} role='tabpanel'>
      <StudioHeading data-size='lg' spacing level={1}>
        {t('resourceadm.policy_editor_title')}
      </StudioHeading>
      {displayContent()}
    </div>
  );
};
