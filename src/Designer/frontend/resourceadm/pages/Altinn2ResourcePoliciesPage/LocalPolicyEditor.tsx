import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  mergeActionsFromPolicyWithActionOptions,
  mergeSubjectsFromPolicyWithSubjectOptions,
  PolicyEditor,
  type Policy,
} from '@altinn/policy-editor';
import {
  StudioAlert,
  StudioButton,
  StudioCheckbox,
  StudioDialog,
  StudioHeading,
  StudioSpinner,
} from '@studio/components';
import type { ResourceError, ResourceTypeOption } from 'app-shared/types/ResourceAdm';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
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
import { useResourcePolicyPublishStatusQuery } from '../../hooks/queries';

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
  const [isPublishToOtherEnvChecked, setIsPublishToOtherEnvChecked] = useState<boolean>(false);
  const [publishError, setPublishError] = useState<{
    failedEnv: string;
    skippedEnv?: string;
    status?: number;
  } | null>(null);

  // Get the data
  const { data: publishStatusData, isPending: isPublishStatusPending } =
    useResourcePolicyPublishStatusQuery(org, app, tableData.identifier);
  const { data: actionData, isPending: isActionPending } = useResourcePolicyActionsQuery(org, app);

  const { data: subjectData, isPending: isLoadingSubjects } = useResourcePolicySubjectsQuery(
    org,
    app,
  );
  const { data: accessPackages, isPending: isLoadingAccessPackages } =
    useResourceAccessPackagesQuery(org, app);

  const { mutateAsync: updatePolicyMutation, isPending: isUpdatingPolicy } =
    usePublishResourcePolicyMutation(org, app, tableData.identifier);

  const publishToEnv = async (publishEnv: string, skippedEnv?: string): Promise<boolean> => {
    try {
      await updatePolicyMutation({ env: publishEnv, payload: updatedPolicy });
      return true;
    } catch (error) {
      setPublishError({
        failedEnv: publishEnv,
        skippedEnv,
        status: (error as ResourceError).response?.status,
      });
      return false;
    }
  };

  const publishNewPolicy = async () => {
    setPublishError(null);
    const isPublished =
      (await publishToEnv(env, isPublishToOtherEnvChecked ? otherEnv : undefined)) &&
      (!isPublishToOtherEnvChecked || (await publishToEnv(otherEnv)));
    if (isPublished) {
      onPolicyUpdated({
        identifier: tableData.identifier,
        policy: updatedPolicy,
        resourceType: tableData.resourceType,
        existsInGitea: false,
      });
    }
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
  const otherEnv = env === 'prod' ? 'tt02' : 'prod';

  const getPublishErrorReason = (status: number | undefined, failedEnv: string): string | null => {
    const envName = t(`resourceadm.altinn2policy_env_${failedEnv}`);
    switch (status) {
      case ServerCodes.Forbidden:
        return t('resourceadm.resource_publish_no_access', { envName });
      case ServerCodes.NotFound:
        return t('resourceadm.altinn2policy_publish_error_not_found', { env: envName });
      default:
        return null;
    }
  };
  const isPublishedInOtherEnv = publishStatusData?.publishedVersions.some(
    (version) => version.environment === otherEnv && version.version,
  );

  const heading = (
    <StudioDialog.Block className={classes.dialogHeading}>
      <StudioHeading level={1} data-size='xs'>
        {t('resourceadm.altinn2policy_dialog_heading', { resourceId: tableData.identifier })}
      </StudioHeading>
    </StudioDialog.Block>
  );

  if (isActionPending || isLoadingSubjects || isLoadingAccessPackages || isPublishStatusPending) {
    return (
      <>
        {heading}
        <StudioSpinner aria-label={t('resourceadm.altinn2policy_policy_spinner')} />
      </>
    );
  }

  const numberOfAltinn2Roles = getDeprecatedAltinn2Subjects(updatedPolicy.rules || []).length;

  return (
    <>
      {heading}
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
      <StudioDialog.Block className={classes.buttonRowWrapper}>
        <div>
          <StudioCheckbox
            checked={isPublishToOtherEnvChecked}
            onChange={(e) => setIsPublishToOtherEnvChecked(e.target.checked)}
            disabled={!isPublishedInOtherEnv}
            label={t('resourceadm.altinn2policy_publish_to_other_env', {
              env: t(`resourceadm.altinn2policy_env_${otherEnv}`),
            })}
          />
          <div className={classes.buttonRow}>
            <StudioButton onClick={publishNewPolicy} loading={isUpdatingPolicy}>
              {t('resourceadm.altinn2policy_publish')}
            </StudioButton>
            <StudioButton variant='tertiary' onClick={onClose}>
              {t('resourceadm.altinn2policy_cancel')}
            </StudioButton>
            <StudioAlert
              data-color={numberOfAltinn2Roles === 0 ? 'success' : 'warning'}
              className={classes.altinn2RolesAlert}
            >
              {t('resourceadm.altinn2policy_number_of_roles', { count: numberOfAltinn2Roles })}
            </StudioAlert>
          </div>
        </div>
        {publishError && (
          <StudioAlert data-color='danger'>
            {publishError.skippedEnv
              ? t('resourceadm.altinn2policy_publish_error_other_env_skipped', {
                  env: t(`resourceadm.altinn2policy_env_${publishError.failedEnv}`),
                  skippedEnv: t(`resourceadm.altinn2policy_env_${publishError.skippedEnv}`),
                })
              : t('resourceadm.altinn2policy_publish_error', {
                  env: t(`resourceadm.altinn2policy_env_${publishError.failedEnv}`),
                })}{' '}
            {getPublishErrorReason(publishError.status, publishError.failedEnv)}
          </StudioAlert>
        )}
      </StudioDialog.Block>
    </>
  );
};
