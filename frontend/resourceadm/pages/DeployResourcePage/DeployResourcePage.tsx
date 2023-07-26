import React, { useEffect, useState } from 'react';
import classes from './DeployResourcePage.module.css';
import { DeployErrorType, ResourceDeployStatus } from 'resourceadm/components/ResourceDeployStatus';
import { ResourceDeployEnvCard } from 'resourceadm/components/ResourceDeployEnvCard';
import { useOnce } from 'resourceadm/hooks/useOnce';
import { TextField, Button, Spinner } from '@digdir/design-system-react';
import { get } from 'app-shared/utils/networking';
import { getValidatePolicyUrl, getValidateResourceUrl } from 'resourceadm/utils/backendUrlUtils';
import { useParams } from 'react-router-dom';
import { NavigationBarPageType } from 'resourceadm/types/global';
import { useRepoStatusQuery, useResourcePolicyPublishStatusQuery } from 'resourceadm/hooks/queries';
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

  // TODO - Tanstack: https://tanstack.com/query/latest
  const [loadingValidatePolicy, setLoadingValidatePolicy] = useState(false);
  const [loadingValidateResource, setLoadingValidateResource] = useState(false);

  const [isLocalRepoInSync, setIsLocalRepoInSync] = useState(false);

  const [hasResourceError, setHasResourceError] = useState(true);
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

  // TODO -  might need to adjust this in future
  useEffect(() => {
    if (!versionLoading) {
      setNewVersionText(versionData.resourceVersion ?? '');
    }
  }, [versionData, versionLoading]);

  /**
   * When the page loads, validate the resource and policy and display error / success
   */
  useOnce(() => {
    setLoadingValidatePolicy(true);
    setLoadingValidateResource(true);

    // Validate policy
    get(getValidatePolicyUrl(selectedContext, repo, resourceId))
      .then((validatePolicyRes) => {
        // Remove error if status is 200
        setHasPolicyError(validatePolicyRes.status === 200 ? 'none' : 'validationFailed');
        setLoadingValidatePolicy(false);
      })
      .catch((err) => {
        // If the ploicy does not exist, set it
        if (err.response.status === 404) setHasPolicyError('notExisting');
        setLoadingValidatePolicy(false);
      });

    // Validate resource
    get(getValidateResourceUrl(selectedContext, repo, resourceId))
      .then((validateResourceRes) => {
        // Remove error if status is 200
        validateResourceRes.status === 200 && setHasResourceError(false);
        setLoadingValidateResource(false);
      })
      .catch(() => {
        setLoadingValidateResource(false);
      });
  });

  /**
   * Constantly check the repostatus to see if we are behind or ahead of master
   */
  useEffect(() => {
    if (repoStatus) {
      setIsLocalRepoInSync(
        (repoStatus.behindBy === 0 || repoStatus.behindBy === null) &&
          (repoStatus.aheadBy === 0 || repoStatus.aheadBy === null)
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
      hasResourceError ||
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
    if (hasResourceError || hasPolicyError !== 'none') {
      const errorList: DeployErrorType[] = [];
      if (hasResourceError) {
        errorList.push({
          message: 'Du har mangler i ressursen',
          pageWithError: 'about',
        });
      }
      if (hasPolicyError !== 'none') {
        errorList.push({
          message:
            hasPolicyError === 'validationFailed'
              ? 'Du har mangler i policyen'
              : 'Du mangler policy',
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
    if (
      type === 'test' &&
      !hasResourceError &&
      !hasPolicyError &&
      isLocalRepoInSync &&
      envVersion !== versionData.resourceVersion
    ) {
      return true;
    }
    if (
      type === 'prod' &&
      !hasResourceError &&
      !hasPolicyError &&
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
    if (versionLoading || loadingValidatePolicy || loadingValidateResource) {
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
