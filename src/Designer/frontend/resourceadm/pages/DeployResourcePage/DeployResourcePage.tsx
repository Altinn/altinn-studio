import React, { useState } from 'react';
import classes from './DeployResourcePage.module.css';
import { ResourceDeployStatus } from '../../components/ResourceDeployStatus';
import { ResourceDeployEnvCard } from '../../components/ResourceDeployEnvCard';
import {
  StudioTextfield,
  StudioHeading,
  StudioLabelAsParagraph,
  StudioParagraph,
  StudioLink,
  StudioAlert,
  StudioErrorMessage,
} from 'libs/studio-components-legacy/src';
import { StudioSpinner } from 'libs/studio-components/src';
import type { NavigationBarPage } from '../../types/NavigationBarPage';
import type { DeployError } from '../../types/DeployError';
import {
  useResourcePolicyPublishStatusQuery,
  useValidatePolicyQuery,
  useValidateResourceQuery,
} from '../../hooks/queries';
import { useRepoStatusQuery } from 'app-shared/hooks/queries';
import { useTranslation, Trans } from 'react-i18next';
import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';
import { useUrlParams } from '../../hooks/useUrlParams';
import { getAvailableEnvironments } from '../../utils/resourceUtils';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { UrlConstants } from '../../utils/urlUtils';

export type DeployResourcePageProps = {
  navigateToPageWithError: (page: NavigationBarPage) => void;
  resourceVersionText: string;
  onSaveVersion: (version: string) => void;
  id: string;
  isSavingResource: boolean;
};

/**
 * @component
 *    Displays the deploy page for resources
 *
 * @property {function}[navigateToPageWithError] - Function that navigates to a page with errors
 * @property {string}[resourceVersionText] - The current version stored
 * @property {function}[onSaveVersion] - Saves the version to backend
 * @property {string}[id] - The id of the page
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const DeployResourcePage = ({
  navigateToPageWithError,
  resourceVersionText,
  onSaveVersion,
  id,
  isSavingResource,
}: DeployResourcePageProps): React.JSX.Element => {
  const { t } = useTranslation();

  const { org, app, resourceId } = useUrlParams();

  const [newVersionText, setNewVersionText] = useState(resourceVersionText);

  // Queries to get metadata
  const { data: repoStatus, isFetching: isLoadingRepoStatus } = useRepoStatusQuery(org, app);
  const {
    status: publishStatusStatus,
    data: publishStatusData,
    error: publishStatusError,
  } = useResourcePolicyPublishStatusQuery(org, app, resourceId);
  const {
    status: validatePolicyStatus,
    data: validatePolicyData,
    error: validatePolicyError,
  } = useValidatePolicyQuery(org, app, resourceId);
  const {
    status: validateResourceStatus,
    data: validateResourceData,
    error: validateResourceError,
  } = useValidateResourceQuery(org, app, resourceId);

  const isLocalRepoInSync =
    repoStatus &&
    (repoStatus.behindBy === 0 || repoStatus.behindBy === null) &&
    (repoStatus.aheadBy === 0 || repoStatus.aheadBy === null) &&
    repoStatus.contentStatus.length === 0;

  const onVersionFieldChanged = (newVersion: string): void => {
    setNewVersionText(newVersion);
    onSaveVersion(newVersion);
  };

  /**
   * Gets either error, pending or success for the card type
   *
   * @returns error, pending or success
   */
  const getStatusCardType = (): 'error' | 'success' | 'pending' => {
    if (isSavingResource || isLoadingRepoStatus) {
      return 'pending';
    } else if (
      validateResourceData.status !== 200 ||
      validatePolicyData.status !== 200 ||
      !isLocalRepoInSync ||
      resourceVersionText === ''
    ) {
      return 'error';
    }

    return 'success';
  };

  /**
   * Returns the different error messages for a policy based on the status
   */
  const getPolicyValidationErrorMessage = () => {
    switch (validatePolicyData.status) {
      case 400: {
        return 'resourceadm.deploy_status_card_error_policy_page';
      }
      case 404: {
        return 'resourceadm.deploy_status_card_error_policy_page_missing';
      }
      default: {
        return 'resourceadm.deploy_status_card_error_policy_page_default';
      }
    }
  };

  /**
   * Returns the correct error type for the deploy page
   */
  const getStatusError = (): DeployError[] => {
    if (validateResourceData.status !== 200 || validatePolicyData.status !== 200) {
      const errorList: DeployError[] = [];
      if (validateResourceData.status !== 200) {
        errorList.push({
          message: validateResourceData.errors
            ? 'resourceadm.deploy_status_card_error_resource_page'
            : 'resourceadm.deploy_status_card_error_resource_page_default',
          pageWithError: 'about',
          numberOfErrors: validateResourceData.errors.length,
        });
      }
      if (validatePolicyData.status !== 200) {
        errorList.push({
          message: validatePolicyData.errors
            ? getPolicyValidationErrorMessage()
            : 'resourceadm.deploy_status_card_error_policy_page_default',
          pageWithError: 'policy',
          numberOfErrors: validatePolicyData.errors.length,
        });
      }
      return errorList;
    } else if (resourceVersionText === '') {
      return [{ message: 'resourceadm.deploy_status_card_error_version' }];
    } else if (!isLocalRepoInSync) {
      return [{ message: 'resourceadm.deploy_status_card_error_repo' }];
    }
    return [];
  };

  /**
   * Displays a spinner when loading the status or displays the status card
   */
  const displayStatusCard = () => {
    const statusCardType = getStatusCardType();
    if (statusCardType === 'pending') {
      return (
        <StudioSpinner data-size='xl' aria-label={t('resourceadm.deploy_status_card_loading')} />
      );
    } else if (statusCardType === 'error') {
      return (
        <ResourceDeployStatus
          title={t('resourceadm.deploy_status_card_error_title')}
          error={getStatusError()}
          onNavigateToPageWithError={navigateToPageWithError}
          resourceId={resourceId}
        />
      );
    }
    return (
      <ResourceDeployStatus
        title={t('resourceadm.deploy_status_card_success')}
        error={[]}
        isSuccess
        resourceId={resourceId}
      />
    );
  };

  /**
   * Checks if deploy is possible for the given type
   *
   * @param type the environment, test or prod
   *
   * @returns a boolean for if it is possible
   */
  const isDeployPossible = (envVersion: string): boolean => {
    const policyError =
      validatePolicyData === undefined || validatePolicyData.status !== ServerCodes.Ok;
    const isLoading =
      mergeQueryStatuses(publishStatusStatus, validatePolicyStatus, validateResourceStatus) ===
        'pending' ||
      isSavingResource ||
      isLoadingRepoStatus;

    const canDeploy =
      validateResourceData.status === 200 &&
      !policyError &&
      !isLoading &&
      isLocalRepoInSync &&
      resourceVersionText !== '' &&
      envVersion !== resourceVersionText;

    return canDeploy;
  };

  /**
   * Display the content on the page
   */
  const displayContent = () => {
    switch (mergeQueryStatuses(publishStatusStatus, validatePolicyStatus, validateResourceStatus)) {
      case 'pending': {
        return (
          <div>
            <StudioSpinner data-size='xl' aria-label={t('resourceadm.deploy_spinner')} />
          </div>
        );
      }
      case 'error': {
        return (
          <StudioAlert severity='danger'>
            <StudioParagraph size='md'>{t('general.fetch_error_message')}</StudioParagraph>
            <StudioParagraph size='md'>{t('general.error_message_with_colon')}</StudioParagraph>
            {publishStatusError && (
              <StudioErrorMessage size='md'>{publishStatusError.message}</StudioErrorMessage>
            )}
            {validatePolicyError && (
              <StudioErrorMessage size='md'>{validatePolicyError.message}</StudioErrorMessage>
            )}
            {validateResourceError && (
              <StudioErrorMessage size='md'>{validateResourceError.message}</StudioErrorMessage>
            )}
          </StudioAlert>
        );
      }
      case 'success': {
        const getVersionString = (env: string): string => {
          return (
            publishStatusData.publishedVersions.find((v) => v.environment === env)?.version ??
            t('resourceadm.deploy_not_deployed')
          );
        };

        return (
          <>
            <StudioHeading size='lg' spacing level={1}>
              {t('resourceadm.deploy_title')}
            </StudioHeading>
            <div className={classes.contentWrapper}>
              {displayStatusCard()}
              <StudioParagraph size='sm' className={classes.informationText}>
                <Trans i18nKey='resourceadm.deploy_description'>
                  <StudioLink href={UrlConstants.ALTINN} rel='noopener noreferrer' target='_blank'>
                    Altinn.no
                  </StudioLink>
                </Trans>
              </StudioParagraph>
              <div className={classes.newVersionWrapper}>
                <StudioTextfield
                  label={t('resourceadm.deploy_version_label')}
                  description={t('resourceadm.deploy_version_text')}
                  value={newVersionText}
                  onChange={(e) => onVersionFieldChanged(e.target.value)}
                  error={resourceVersionText === ''}
                />
              </div>
              <StudioLabelAsParagraph size='md' spacing>
                {t('resourceadm.deploy_select_env_label')}
              </StudioLabelAsParagraph>
              <div className={classes.environmentWrapper}>
                {getAvailableEnvironments(org).map((env) => {
                  const versionString = getVersionString(env.id);
                  return (
                    <ResourceDeployEnvCard
                      key={env.id}
                      isDeployPossible={isDeployPossible(versionString)}
                      env={env}
                      currentEnvVersion={versionString}
                      newEnvVersion={
                        resourceVersionText !== versionString ? resourceVersionText : undefined
                      }
                    />
                  );
                })}
              </div>
            </div>
          </>
        );
      }
    }
  };

  return (
    <div className={classes.deployPageWrapper} id={id} role='tabpanel'>
      {displayContent()}
    </div>
  );
};
