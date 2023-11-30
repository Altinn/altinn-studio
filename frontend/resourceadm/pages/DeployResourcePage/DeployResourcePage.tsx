import React, { useEffect, useState } from 'react';
import classes from './DeployResourcePage.module.css';
import { ResourceDeployStatus } from 'resourceadm/components/ResourceDeployStatus';
import { ResourceDeployEnvCard } from 'resourceadm/components/ResourceDeployEnvCard';
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
import { useParams } from 'react-router-dom';
import type { NavigationBarPage, DeployError } from 'resourceadm/types/global';
import {
  useResourcePolicyPublishStatusQuery,
  useValidatePolicyQuery,
  useValidateResourceQuery,
} from 'resourceadm/hooks/queries';
import { useRepoStatusQuery } from 'app-shared/hooks/queries';
import { useTranslation, Trans } from 'react-i18next';
import { usePublishResourceMutation } from 'resourceadm/hooks/mutations';
import { toast } from 'react-toastify';
import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';

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
 * @returns {React.ReactNode} - The rendered component
 */
export const DeployResourcePage = ({
  navigateToPageWithError,
  resourceVersionText,
  onSaveVersion,
  id,
}: DeployResourcePageProps): React.ReactNode => {
  const { t } = useTranslation();

  const { org: selectedContext, resourceId } = useParams();
  const repo = `${selectedContext}-resources`;

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

  const handlePublish = (env: 'tt02' | 'prod' | 'at22' | 'at23') => {
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
  const isDeployPossible = (type: 'test' | 'prod', envVersion: string): boolean => {
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
        const tt02Version: string =
          publishStatusData.publishedVersions.find((v) => v.environment === 'tt02')?.version ??
          t('resourceadm.deploy_not_deployed');
        const prodVersion =
          publishStatusData.publishedVersions.find((v) => v.environment === 'prod')?.version ??
          t('resourceadm.deploy_not_deployed');
        const at22Version =
          publishStatusData.publishedVersions.find((v) => v.environment === 'at22')?.version ??
          t('resourceadm.deploy_not_deployed');
        const at23Version =
          publishStatusData.publishedVersions.find((v) => v.environment === 'at23')?.version ??
          t('resourceadm.deploy_not_deployed');

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
                <div className={classes.textAndButton}>
                  <div className={classes.textfield}>
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
                </div>
              </div>
              <Label size='medium' spacing>
                {t('resourceadm.deploy_select_env_label')}
              </Label>
              <div className={classes.deployCardsWrapper}>
                <ResourceDeployEnvCard
                  isDeployPossible={isDeployPossible('test', tt02Version)}
                  envName={t('resourceadm.deploy_test_env')}
                  currentEnvVersion={tt02Version}
                  newEnvVersion={
                    resourceVersionText !== tt02Version ? resourceVersionText : undefined
                  }
                  onClick={() => handlePublish('tt02')}
                  loading={publisingResourcePending && envPublishedTo === 'tt02'}
                />
                <ResourceDeployEnvCard
                  isDeployPossible={isDeployPossible('prod', prodVersion)}
                  envName={t('resourceadm.deploy_prod_env')}
                  currentEnvVersion={prodVersion}
                  newEnvVersion={
                    resourceVersionText !== prodVersion ? resourceVersionText : undefined
                  }
                  onClick={() => handlePublish('prod')}
                  loading={publisingResourcePending && envPublishedTo === 'prod'}
                />
              </div>
              {selectedContext === 'ttd' && (
                <div className={classes.deployCardsWrapper}>
                  <ResourceDeployEnvCard
                    isDeployPossible={isDeployPossible('test', at22Version)}
                    envName={t('resourceadm.deploy_at22_env')}
                    currentEnvVersion={at22Version}
                    newEnvVersion={
                      resourceVersionText !== at22Version ? resourceVersionText : undefined
                    }
                    onClick={() => handlePublish('at22')}
                    loading={publisingResourcePending && envPublishedTo === 'at22'}
                  />
                  <ResourceDeployEnvCard
                    isDeployPossible={isDeployPossible('prod', at23Version)}
                    envName={t('resourceadm.deploy_at23_env')}
                    currentEnvVersion={at23Version}
                    newEnvVersion={
                      resourceVersionText !== at23Version ? resourceVersionText : undefined
                    }
                    onClick={() => handlePublish('at23')}
                    loading={publisingResourcePending && envPublishedTo === 'at23'}
                  />
                </div>
              )}
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
