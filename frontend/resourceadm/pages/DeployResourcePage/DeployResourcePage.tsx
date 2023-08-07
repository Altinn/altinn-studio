import React, { useEffect, useState } from 'react';
import classes from './DeployResourcePage.module.css';
import { DeployErrorType, ResourceDeployStatus } from 'resourceadm/components/ResourceDeployStatus';
import { ResourceDeployEnvCard } from 'resourceadm/components/ResourceDeployEnvCard';
import { TextField, Button, Spinner } from '@digdir/design-system-react';
import { useParams } from 'react-router-dom';
import { NavigationBarPageType } from 'resourceadm/types/global';
import {
  useRepoStatusQuery,
  useResourcePolicyPublishStatusQuery,
  useValidatePolicyQuery,
  useValidateResourceQuery,
} from 'resourceadm/hooks/queries';
import { UploadIcon } from '@navikt/aksel-icons';
import { ScreenReaderSpan } from 'resourceadm/components/ScreenReaderSpan';

interface Props {
  navigateToPageWithError: (page: NavigationBarPageType) => void;
}

/**
 * Displays the deploy page for resources
 *
 * @param props.isLocalRepoInSync boolean for if the local repo is in sync or not
 */
export const DeployResourcePage = ({ navigateToPageWithError }: Props) => {
  const { selectedContext, resourceId } = useParams();
  const repo = `${selectedContext}-resources`;

  const [isLocalRepoInSync, setIsLocalRepoInSync] = useState(false);
  const [hasPolicyError, setHasPolicyError] = useState<'none' | 'validationFailed' | 'notExisting'>(
    'none'
  );
  const [newVersionText, setNewVersionText] = useState('');

  // Queries to get metadata
  const { data: repoStatus } = useRepoStatusQuery(selectedContext, repo);
  const { data: versionData, isLoading: versionLoading } = useResourcePolicyPublishStatusQuery(
    selectedContext,
    repo,
    resourceId
  );
  const { data: validatePolicyData, isLoading: validatePolicyLoading } = useValidatePolicyQuery(
    selectedContext,
    repo,
    resourceId
  );
  const { data: validateResourceData, isLoading: validateResourceLoading } =
    useValidateResourceQuery(selectedContext, repo, resourceId);

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
  useEffect(() => {
    if (!versionLoading) {
      setNewVersionText(versionData.resourceVersion ?? '');
    }
  }, [versionData, versionLoading]);

  /**
   * Constantly check the repostatus to see if we are behind or ahead of master
   */
  useEffect(() => {
    if (repoStatus) {
      setIsLocalRepoInSync(
        (repoStatus.behindBy === 0 || repoStatus.behindBy === null) &&
          (repoStatus.aheadBy === 0 || repoStatus.aheadBy === null) &&
          repoStatus.contentStatus.length === 0
      );
    }
  }, [repoStatus]);

  /**
   * Gets either danger or success for the card type
   *
   * @returns danger or success
   */
  const getStatusCardType = (): 'danger' | 'success' => {
    // TODO - Add check for if version is correct
    if (
      validateResourceData.status !== 200 ||
      hasPolicyError !== 'none' ||
      !isLocalRepoInSync ||
      versionData.resourceVersion === null
    )
      return 'danger';
    return 'success';
  };

  /**
   * Returns the correct error type for the deploy page
   */
  const getStatusError = (): DeployErrorType[] | string => {
    if (validateResourceData.status !== 200 || hasPolicyError !== 'none') {
      const errorList: DeployErrorType[] = [];
      if (validateResourceData.status !== 200) {
        errorList.push({
          message: 'Det finnes mangler på siden "Om ressursen"',
          pageWithError: 'about',
        });
      }
      if (hasPolicyError !== 'none') {
        errorList.push({
          message:
            hasPolicyError === 'validationFailed'
              ? 'Det finnes mangler på siden "Tilgangsregler"'
              : 'Du må ha minst en regel på siden "Tilgangsregler"',
          pageWithError: 'policy',
        });
      }
      return errorList;
    } else if (!isLocalRepoInSync) {
      return 'Lokalt repo er ikke i sync med remote repo. Vennligst last opp og hent ned slik at du er i sync.';
    } else if (versionData.resourceVersion === null) {
      return 'Lokalt repo mangler versjonsnummer. Vennligst last opp et versjonnummer i feltet under.';
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
          title='Ressursen er klar til å publiseres'
          error={[]}
          isSuccess
          resourceId={resourceId}
        />
      );
    }
    return (
      <ResourceDeployStatus
        title='Du må fikse disse feilene før du kan gå videre'
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
      envVersion !== versionData.resourceVersion
    ) {
      return true;
    }
    if (
      type === 'prod' &&
      validateResourceData.status === 200 &&
      !policyError &&
      isLocalRepoInSync &&
      envVersion !== versionData.resourceVersion
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
          <Spinner size='3xLarge' variant='interaction' title='Laster inn policy' />
        </div>
      );
    } else {
      const versionInTest = versionData.publishedVersions.find(
        (v) => v.environment === 'TT02'
      ).version;
      const versionInProd = versionData.publishedVersions.find(
        (v) => v.environment === 'PROD'
      ).version;

      return (
        <>
          <h1 className={classes.pageHeader}>Publiser ressursen</h1>
          <div className={classes.contentWrapper}>
            {displayStatusCard()}
            <div className={classes.newVersionWrapper}>
              <h2 className={classes.subHeader}>Nytt versjonsnummer</h2>
              <p className={classes.text}>Sett et versjonsnummer for endringene du har gjort</p>
              <div className={classes.textAndButton}>
                <div className={classes.textfield}>
                  <TextField
                    placeholder=''
                    value={newVersionText}
                    onChange={(e) => setNewVersionText(e.target.value)}
                    aria-labelledby='versionnumber-field'
                  />
                </div>
                <ScreenReaderSpan id='versionnumber-field' label='Nytt versjonssnummer' />
                <Button
                  color='primary'
                  onClick={() => {
                    // TODO - Save new version number - Missing API call
                    alert('todo - Save new version number');
                  }}
                  iconPlacement='left'
                  icon={<UploadIcon title='Lagre versjonsnummer' />}
                >
                  Last opp dine endringer
                </Button>
              </div>
            </div>
            <h2 className={classes.subHeader}>Velg miljø der du ønsker å publisere endringene</h2>
            <div className={classes.deployCardsWrapper}>
              <ResourceDeployEnvCard
                isDeployPossible={isDeployPossible('test', versionInTest)}
                envName='Testmiljø TT-02'
                currentEnvVersion={versionInTest}
                newEnvVersion={
                  versionData.resourceVersion !== versionInTest
                    ? versionData.resourceVersion
                    : undefined
                }
              />
              <ResourceDeployEnvCard
                isDeployPossible={isDeployPossible('prod', versionInProd)}
                envName='Produksjonsmiljø'
                currentEnvVersion={versionInProd}
                newEnvVersion={
                  versionData.resourceVersion !== versionInProd
                    ? versionData.resourceVersion
                    : undefined
                }
              />
            </div>
          </div>
        </>
      );
    }
  };

  return <div className={classes.deployPageWrapper}>{displayContent()}</div>;
};
