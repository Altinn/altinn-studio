import React, { useEffect, useState } from 'react';
import classes from './DeployResourcePage.module.css';
import { ResourceDeployStatus } from 'resourceadm/components/ResourceDeployStatus';
import { ResourceDeployEnvCard } from 'resourceadm/components/ResourceDeployEnvCard';
import { Textfield, Spinner, Heading, Label, Paragraph, Link } from '@digdir/design-system-react';
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

type DeployResourcePageProps = {
  /**
   * Function that navigates to a page with errors
   * @param page the page to navigate to
   * @returns void
   */
  navigateToPageWithError: (page: NavigationBarPage) => void;
  resourceVersionText: string;
  onSaveVersion: (version: string) => void;
};

/**
 * @component
 *    Displays the deploy page for resources
 *
 * @property {function}[navigateToPageWithError] - Function that navigates to a page with errors
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const DeployResourcePage = ({
  navigateToPageWithError,
  resourceVersionText,
  onSaveVersion,
}: DeployResourcePageProps): React.ReactNode => {
  console.log(resourceVersionText);
  const { t } = useTranslation();

  const { selectedContext, resourceId } = useParams();
  const repo = `${selectedContext}-resources`;

  const [isLocalRepoInSync, setIsLocalRepoInSync] = useState(false);
  const [hasPolicyError, setHasPolicyError] = useState<'none' | 'validationFailed' | 'notExisting'>(
    'none',
  );
  const [newVersionText, setNewVersionText] = useState(resourceVersionText);

  // Queries to get metadata
  const { data: repoStatus } = useRepoStatusQuery(selectedContext, repo);
  const { data: versionData, isLoading: versionLoading } = useResourcePolicyPublishStatusQuery(
    selectedContext,
    repo,
    resourceId,
  );
  const { data: validatePolicyData, isLoading: validatePolicyLoading } = useValidatePolicyQuery(
    selectedContext,
    repo,
    resourceId,
  );
  const { data: validateResourceData, isLoading: validateResourceLoading } =
    useValidateResourceQuery(selectedContext, repo, resourceId);

  // Query function fo rpublishing a resource
  const { mutate: publishResource } = usePublishResourceMutation(selectedContext, repo, resourceId);

  const handlePublish = (env: 'tt02' | 'prod' | 'at22' | 'at23') => {
    console.log('Trying to publish to: ', env);
    publishResource(env, {
      onSuccess: () => {
        toast.success(t('resourceadm.resource_published_success'));
      },
      onError: (data) => console.log(data),
    });
  };

  /**
   * Set the value for policy error
   */
  useEffect(() => {
    if (!validatePolicyLoading) {
      if (validatePolicyData === undefined) setHasPolicyError('notExisting');
      else if (validatePolicyData.status === 400) setHasPolicyError('validationFailed');
      else setHasPolicyError('none');
    }
  }, [validatePolicyData, validatePolicyLoading]);

  // TODO -  might need to adjust this in future
  /*useEffect(() => {
    if (!versionLoading) {
      setNewVersionText(versionData.resourceVersion ?? '');
    }
  }, [versionData, versionLoading]);*/

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
      hasPolicyError !== 'none' ||
      !isLocalRepoInSync ||
      resourceVersionText === ''
    )
      return 'danger';
    return 'success';
  };

  /**
   * Returns the correct error type for the deploy page
   */
  const getStatusError = (): DeployError[] | string => {
    if (validateResourceData.status !== 200 || hasPolicyError !== 'none') {
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
      if (hasPolicyError !== 'none') {
        errorList.push({
          message:
            hasPolicyError === 'validationFailed'
              ? validatePolicyData.errors
                ? t('resourceadm.deploy_status_card_error_policy_page', {
                    num: validatePolicyData.errors.length,
                  })
                : t('resourceadm.deploy_status_card_error_policy_page_default')
              : t('resourceadm.deploy_status_card_error_policy_page_missing'),
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
    if (versionLoading || validatePolicyLoading || validateResourceLoading) {
      return (
        <div className={classes.spinnerWrapper}>
          <Spinner size='3xLarge' variant='interaction' title={t('resourceadm.deply_spinner')} />
        </div>
      );
    } else {
      const versionInTest = versionData.publishedVersions.find(
        (v) => v.environment === 'TT02',
      ).version;
      const versionInProd = versionData.publishedVersions.find(
        (v) => v.environment === 'PROD',
      ).version;

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
                isDeployPossible={isDeployPossible('test', versionInTest)}
                envName={t('resourceadm.deploy_test_env')}
                currentEnvVersion={versionInTest}
                newEnvVersion={
                  resourceVersionText !== versionInTest ? resourceVersionText : undefined
                }
                onClick={() => handlePublish('tt02')}
              />
              <ResourceDeployEnvCard
                isDeployPossible={isDeployPossible('prod', versionInProd)}
                envName={t('resourceadm.deploy_prod_env')}
                currentEnvVersion={versionInProd}
                newEnvVersion={
                  resourceVersionText !== versionInProd ? resourceVersionText : undefined
                }
                onClick={() => handlePublish('prod')}
              />
            </div>
            {selectedContext === 'ttd' && (
              <div className={classes.deployCardsWrapper}>
                <ResourceDeployEnvCard
                  isDeployPossible={isDeployPossible('test', versionInTest)}
                  envName={t('resourceadm.deploy_at22_env')}
                  currentEnvVersion={versionInTest}
                  newEnvVersion={
                    resourceVersionText !== versionInTest ? resourceVersionText : undefined
                  }
                  onClick={() => handlePublish('at22')}
                />
                <ResourceDeployEnvCard
                  isDeployPossible={isDeployPossible('prod', versionInProd)}
                  envName={t('resourceadm.deploy_at23_env')}
                  currentEnvVersion={versionInProd}
                  newEnvVersion={
                    resourceVersionText !== versionInProd ? resourceVersionText : undefined
                  }
                  onClick={() => handlePublish('at23')}
                />
              </div>
            )}
          </div>
        </>
      );
    }
  };

  return <div className={classes.deployPageWrapper}>{displayContent()}</div>;
};
