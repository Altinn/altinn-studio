import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  mergeActionsFromPolicyWithActionOptions,
  mergeSubjectsFromPolicyWithSubjectOptions,
  PolicyEditor,
  type Policy,
} from '@altinn/policy-editor';
import { StudioAlert, StudioButton, StudioDialog, StudioSpinner } from '@studio/components';
import type { ResourceTypeOption } from 'app-shared/types/ResourceAdm';
import {
  useResourceAccessPackagesQuery,
  useResourcePolicyActionsQuery,
  useResourcePolicySubjectsQuery,
} from 'app-shared/hooks/queries';
import { useUrlParams } from '../../hooks/useUrlParams';
import { usePublishResourcePolicyMutation } from '../../hooks/mutations/usePublishResourcePolicyMutation';
import { getResourceSubjects } from '../../utils/resourceUtils';
import classes from './Altinn2ResourcePoliciesPage.module.css';
import { getDeprecatedAltinn2Subjects } from './altinn2ResourcePolicyUtils';
import type { EnvId, ResourcePolicyData, TableRowData } from './altinn2ResourcePolicyUtils';

export const LocalPolicyEditor = ({
  tableData,
  env,
  onClose,
  onPolicyUpdated,
}: {
  tableData: TableRowData;
  env: EnvId;
  onClose: () => void;
  onPolicyUpdated: (data: ResourcePolicyData) => void;
}) => {
  const { t } = useTranslation();
  const { org, app } = useUrlParams();
  const [updatedPolicy, setUpdatedPolicy] = useState<Policy>(tableData.policy);

  // Get the data
  const { data: actionData, isPending: isActionPending } = useResourcePolicyActionsQuery(org, app);

  const { data: subjectData, isPending: isLoadingSubjects } = useResourcePolicySubjectsQuery(
    org,
    app,
  );
  const { data: accessPackages, isPending: isLoadingAccessPackages } =
    useResourceAccessPackagesQuery(org, app);

  const {
    mutate: updatePolicyMutation,
    isError: isUpdatePolicyError,
    isPending: isUpdatingPolicy,
  } = usePublishResourcePolicyMutation(org, app, tableData.identifier);

  const publishNewPolicy = () => {
    updatePolicyMutation(
      { env: env, payload: updatedPolicy },
      {
        onSuccess: () => {
          onPolicyUpdated({
            identifier: tableData.identifier,
            policy: updatedPolicy,
            resourceType: tableData.resourceType,
            existsInGitea: false,
          });
        },
      },
    );
  };

  const mergedActions = mergeActionsFromPolicyWithActionOptions(
    updatedPolicy.rules,
    actionData || [],
  );
  const subjects = getResourceSubjects(
    [],
    subjectData || [],
    org,
    tableData.resourceType as ResourceTypeOption,
  );
  const mergedSubjects = mergeSubjectsFromPolicyWithSubjectOptions(updatedPolicy.rules, subjects);

  if (isActionPending || isLoadingSubjects || isLoadingAccessPackages) {
    return <StudioSpinner aria-label={t('resourceadm.altinn2policy_policy_spinner')} />;
  }

  const numberOfAltinn2Roles = getDeprecatedAltinn2Subjects(updatedPolicy.rules || []).length;

  return (
    <>
      <StudioDialog.Block>
        <PolicyEditor
          policy={updatedPolicy}
          actions={mergedActions}
          subjects={mergedSubjects}
          accessPackages={accessPackages || []}
          resourceId={tableData.identifier}
          onSave={(policy: Policy) => setUpdatedPolicy(policy)}
          showAllErrors={false}
          usageType='resource'
        />
      </StudioDialog.Block>
      <StudioDialog.Block className={classes.buttonRow}>
        <StudioButton onClick={publishNewPolicy} loading={isUpdatingPolicy}>
          {t('resourceadm.altinn2policy_publish')}
        </StudioButton>
        <StudioButton variant='tertiary' onClick={onClose}>
          {t('resourceadm.altinn2policy_cancel')}
        </StudioButton>
        {isUpdatePolicyError && (
          <StudioAlert data-color='danger'>
            {t('resourceadm.altinn2policy_publish_error')}
          </StudioAlert>
        )}
        <StudioAlert
          data-color={numberOfAltinn2Roles === 0 ? 'success' : 'warning'}
          className={classes.altinn2RolesAlert}
        >
          {t('resourceadm.altinn2policy_number_of_roles', { count: numberOfAltinn2Roles })}
        </StudioAlert>
      </StudioDialog.Block>
    </>
  );
};
