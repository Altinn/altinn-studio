import React, { useEffect, useState } from 'react';
import classes from './DeployResourcePage.module.css';
import { ResourceDeployStatus } from '../../components/ResourceDeployStatus';
import { ResourceDeployEnvCard } from '../../components/ResourceDeployEnvCard';
import {
  Textfield,
  Spinner,
  Heading,
  Label,
  Paragraph,
  Link,
  Alert,
  ErrorMessage,
} from '@digdir/design-system-react';
import type { NavigationBarPage } from '../../types/NavigationBarPage';
import type { DeployError } from '../../types/DeployError';
import {
  useResourcePolicyPublishStatusQuery,
  useValidatePolicyQuery,
  useValidateResourceQuery,
} from '../../hooks/queries';
import { useRepoStatusQuery } from 'app-shared/hooks/queries';
import { useTranslation, Trans } from 'react-i18next';
import { usePublishResourceMutation } from '../../hooks/mutations';
import { toast } from 'react-toastify';
import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';
import { useUrlParams } from '../../hooks/useSelectedContext';
import type { EnvId, EnvType } from '../../utils/resourceUtils/resourceUtils';
import { getAvailableEnvironments } from '../../utils/resourceUtils/resourceUtils';

export type DeployResourcePageProps = {
  navigateToPageWithError: (page: NavigationBarPage) => void;
  resourceVersionText: string;
  onSaveVersion: (version: string) => void;
  id: string;
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
}: DeployResourcePageProps): React.JSX.Element => {
  const { t } = useTranslation();

  const { selectedContext, repo, resourceId } = useUrlParams();

  const [isLocalRepoInSync, setIsLocalRepoInSync] = useState(false);

  const [newVersionText, setNewVersionText] = useState(resourceVersionText);

  const [envPublishedTo, setEnvPublishedTo] = useState(null);

  // Queries to get metadata
  const { data: repoStatus } = useRepoStatusQuery(selectedContext, repo);
  const {
    status: publishStatusStatus,
    data: publishStatusData,
    error: publishStatusError,
  } = useResourcePolicyPublishStatusQuery(selectedContext, repo, resourceId);
  const {
    status: validatePolicyStatus,
    data: validatePolicyData,
    error: validatePolicyError,
  } = useValidatePolicyQuery(selectedContext, repo, resourceId);
  const {
    status: validateResourceStatus,
    data: validateResourceData,
    error: validateResourceError,
  } = useValidateResourceQuery(selectedContext, repo, resourceId);

  // Query function fo rpublishing a resource
  const { mutate: publishResource, isPending: publisingResourcePending } =
    usePublishResourceMutation(selectedContext, repo, resourceId);

  const handlePublish = (env: EnvId) => {
    setEnvPublishedTo(env);
    publishResource(env, {
      onSuccess: () => {
        toast.success(t('resourceadm.resource_published_success'));
        setEnvPublishedTo(null);
      },
      onError: (data) => {
        console.log(data);
        setEnvPublishedTo(null);
      },
    });
  };

  /**
   * Constantly check the repostatus to see if we are behind or ahead of master
   */
  useEffect(() => {
    if (repoStatus) {
      setIsLocalRepoInSync(
        (repoStatus.behindBy === 0 || repoStatus.behindBy === null) &&
          (repoStatus.aheadBy === 0 || repoStatus.aheadBy === null) &&
          repoStatus.contentStatus.length === 0,
      );
    }
  }, [repoStatus]);

  /**
   * Gets either danger or success for the card type
   *
   * @returns danger or success
   */
  const getStatusCardType = (): 'danger' | 'success' => {
    if (
      validateResourceData.status !== 200 ||
      validatePolicyData.status !== 200 ||
      !isLocalRepoInSync ||
      resourceVersionText === ''
    )
      return 'danger';
    return 'success';
  };

  /**
   * Returns the different error messages for a policy based on the status
   */
  const getPolicyValidationErrorMessage = () => {
    switch (validatePolicyData.status) {
      case 400: {
        return t('resourceadm.deploy_status_card_error_policy_page', {
          num: validatePolicyData.errors.length,
        });
      }
      case 404: {
        return t('resourceadm.deploy_status_card_error_policy_page_missing');
      }
      default: {
        return t('resourceadm.deploy_status_card_error_policy_page_default');
      }
    }
  };

  /**
   * Returns the correct error type for the deploy page
   */
  const getStatusError = (): DeployError[] | string => {
    if (validateResourceData.status !== 200 || validatePolicyData.status !== 200) {
      const errorList: DeployError[] = [];
      if (validateResourceData.status !== 200) {
        errorList.push({
          message: validateResourceData.errors
            ? t('resourceadm.deploy_status_card_error_resource_page', {
                num: validateResourceData.errors.length,
              })
            : t('resourceadm.deploy_status_card_error_resource_page_default'),
          pageWithError: 'about',
        });
      }
      if (validatePolicyData.status !== 200) {
        errorList.push({
          message: validatePolicyData.errors
            ? getPolicyValidationErrorMessage()
            : t('resourceadm.deploy_status_card_error_policy_page_default'),
          pageWithError: 'policy',
        });
      }
      return errorList;
    } else if (resourceVersionText === '') {
      return t('resourceadm.deploy_status_card_error_version');
    } else if (!isLocalRepoInSync) {
      return t('resourceadm.deploy_status_card_error_repo');
    }
    return [];
  };

  /**
   * Displays a spinner when loading the status or displays the status card
   */
  const displayStatusCard = () => {
    if (getStatusCardType() === 'success') {
      return (
        <ResourceDeployStatus
          title={t('resourceadm.deploy_status_card_success')}
          error={[]}
          isSuccess
          resourceId={resourceId}
        />
      );
    }
    return (
      <ResourceDeployStatus
        title={t('resourceadm.deploy_status_card_error_title')}
        error={getStatusError()}
        onNavigateToPageWithError={navigateToPageWithError}
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
  const isDeployPossible = (type: EnvType, envVersion: string): boolean => {
    const policyError = validatePolicyData === undefined || validatePolicyData.status === 400;

    if (
      type === 'test' &&
      validateResourceData.status === 200 &&
      !policyError &&
      isLocalRepoInSync &&
      resourceVersionText !== '' &&
      envVersion !== resourceVersionText
    ) {
      return true;
    }
    if (
      type === 'prod' &&
      validateResourceData.status === 200 &&
      !policyError &&
      isLocalRepoInSync &&
      resourceVersionText !== '' &&
      envVersion !== resourceVersionText
    ) {
      return true;
    }
    return false;
  };

  /**
   * Display the content on the page
   */
  const displayContent = () => {
    switch (mergeQueryStatuses(publishStatusStatus, validatePolicyStatus, validateResourceStatus)) {
      case 'pending': {
        return (
          <div>
            <Spinner size='xlarge' variant='interaction' title={t('resourceadm.deploy_spinner')} />
          </div>
        );
      }
      case 'error': {
        return (
          <Alert severity='danger'>
            <Paragraph>{t('general.fetch_error_message')}</Paragraph>
            <Paragraph>{t('general.error_message_with_colon')}</Paragraph>
            {publishStatusError && <ErrorMessage>{publishStatusError.message}</ErrorMessage>}
            {validatePolicyError && <ErrorMessage>{validatePolicyError.message}</ErrorMessage>}
            {validateResourceError && <ErrorMessage>{validateResourceError.message}</ErrorMessage>}
          </Alert>
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
            <Heading size='large' spacing level={1}>
              {t('resourceadm.deploy_title')}
            </Heading>
            <div className={classes.contentWrapper}>
              {displayStatusCard()}
              <Paragraph size='small' className={classes.informationText}>
                <Trans i18nKey='resourceadm.deploy_description'>
                  <Link href='https://www.altinn.no/' rel='noopener noreferrer' target='_blank'>
                    Altinn.no
                  </Link>
                </Trans>
              </Paragraph>
              <div className={classes.newVersionWrapper}>
                <Textfield
                  label={t('resourceadm.deploy_version_label')}
                  description={t('resourceadm.deploy_version_text')}
                  size='small'
                  value={newVersionText}
                  onChange={(e) => setNewVersionText(e.target.value)}
                  onBlur={() => onSaveVersion(newVersionText)}
                  error={resourceVersionText === ''}
                />
              </div>
              <Label size='medium' spacing>
                {t('resourceadm.deploy_select_env_label')}
              </Label>
              <div className={classes.environmentWrapper}>
                {getAvailableEnvironments(selectedContext).map((env) => {
                  const versionString = getVersionString(env.id);
                  return (
                    <ResourceDeployEnvCard
                      key={env.id}
                      isDeployPossible={isDeployPossible(env.envType, versionString)}
                      envName={t(env.label)}
                      currentEnvVersion={versionString}
                      newEnvVersion={
                        resourceVersionText !== versionString ? resourceVersionText : undefined
                      }
                      onClick={() => handlePublish(env.id)}
                      loading={publisingResourcePending && envPublishedTo === env.id}
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
