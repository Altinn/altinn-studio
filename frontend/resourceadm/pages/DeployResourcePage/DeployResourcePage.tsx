import React, { useEffect, useState } from 'react';
import classes from './DeployResourcePage.module.css';
import { ResourceDeployStatus } from 'resourceadm/components/ResourceDeployStatus';
import { ResourceDeployEnvCard } from 'resourceadm/components/ResourceDeployEnvCard';
import { useOnce } from 'resourceadm/hooks/useOnce';
import { TextField, Button, Spinner } from '@digdir/design-system-react';
import { get } from 'app-shared/utils/networking';
import { getValidatePolicyUrlBySelectedContextRepoAndId } from 'resourceadm/utils/backendUrlUtils';
import { useParams } from 'react-router-dom';
import { NavigationBarPageType } from 'resourceadm/types/global';
import { useRepoStatusQuery } from 'resourceadm/hooks/queries';
import { Link } from 'resourceadm/components/Link';
import { UploadIcon } from '@navikt/aksel-icons';
import { ScreenReaderSpan } from 'resourceadm/components/ScreenReaderSpan';

interface Props {
  navigateToPage: (page: NavigationBarPageType) => void;
}

/**
 * Displays the deploy page for resources
 *
 * @param props.isLocalRepoInSync boolean for if the local repo is in sync or not
 */
export const DeployResourcePage = ({ navigateToPage }: Props) => {
  const { selectedContext, resourceId } = useParams();
  const repo = `${selectedContext}-resources`;

  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const [isLocalRepoInSync, setIsLocalRepoInSync] = useState(false);

  // TODO - Find out how the error response looks like
  const [hasResourceError, setHasResourceError] = useState(true);
  const [hasPolicyError, setHasPolicyError] = useState(true);

  const { data: repoStatus } = useRepoStatusQuery(selectedContext, repo);

  // TODO - The user MUST save the version number to backend. When the version number
  // from backend is different than what is in test/prod, then it is valid.
  // Do not compare it with the text directly, it must first be saved.
  // TODO - ADD information box.
  const [newVersionText, setNewVersionText] = useState('');

  const [versionInTest, setVersionInTest] = useState<number>();
  const [versionInProd, setVersionInProd] = useState<number>();
  const [versionInGitea, setVersionInGitea] = useState<number>();

  useOnce(() => {
    get(getValidatePolicyUrlBySelectedContextRepoAndId(selectedContext, repo, resourceId))
      .then((res) => {
        // Remove error if status is 200
        res.status === '200' && setHasPolicyError(false);
      })
      .catch((err) => {
        console.error(err);
      });

    setIsLoading(false);
    setHasError(false);
    setHasResourceError(true);

    /*get(getValidateResourceUrlBySelectedContextRepoAndId(selectedContext, repo, resourceId))
      .then((res) => {
        console.log('res', res);
        res.status === '200' && setHasResourceError(false);
      })
      .catch((err) => console.log(err));
      */
    // TODO - replace with API call
    setVersionInGitea(2);
    setVersionInTest(2);
    setVersionInProd(1);

    // TODO - Replace with API call - If version exists, set it
    setNewVersionText('2');
  });

  useEffect(() => {
    if (repoStatus) {
      setIsLocalRepoInSync(
        (repoStatus.behindBy === 0 || repoStatus.behindBy === null) &&
          (repoStatus.aheadBy === 0 || repoStatus.aheadBy === null)
      );
    }
  }, [repoStatus]);

  /*
    Possible errors on deploy page:
    - Error in resource
    - Error in policy
    - Not pushed / pulled latest changes to / from gitea - ONLY IF THE TWO ABOVE ARE OK

    IF an environment has the same version as the version in gitea,
    - Display text "Oppdater versjonsnummer for å publisere"
  */

  const displayStatusCardContent = () => {
    if (hasResourceError || hasPolicyError) {
      return (
        <div>
          {hasResourceError && (
            <p className={hasResourceError && hasPolicyError && classes.firstError}>
              Det er en feil i ressursen.{' '}
              <Link text='Klikk her for å fikse det.' onClick={() => navigateToPage('about')} />
            </p>
          )}
          {hasPolicyError && (
            <p>
              Det er en feil i policyen.{' '}
              <Link text='Klikk her for å fikse det.' onClick={() => navigateToPage('policy')} />
            </p>
          )}
        </div>
      );
    } else if (!isLocalRepoInSync) {
      return (
        <p>
          Lokalt repo er ikke i sync med remote repo. Vennligst last opp og hent ned slik at du er i
          sync.
        </p>
      );
    } else return <p>Ressursen er klar til å publiseres</p>;
  };

  /**
   * Gets either danger or success for the card type
   *
   * @returns danger or success
   */
  const getStatusCardType = (): 'danger' | 'success' => {
    if (hasResourceError || hasPolicyError || !isLocalRepoInSync) return 'danger';
    return 'success';
  };

  /**
   * Displays a spinner when loading the status or displays the status card
   */
  const displayStatusCard = () => {
    return (
      <ResourceDeployStatus type={getStatusCardType()}>
        {displayStatusCardContent()}
      </ResourceDeployStatus>
    );
  };

  /**
   * Checks if deploy is possible for the given type
   *
   * @param type the environment, test or prod
   *
   * @returns a boolean for if it is possible
   */
  const isDeployPossible = (type: 'test' | 'prod'): boolean => {
    if (
      type === 'test' &&
      !hasResourceError &&
      !hasPolicyError &&
      isLocalRepoInSync &&
      versionInTest !== versionInGitea
    ) {
      return true;
    }
    if (
      type === 'prod' &&
      !hasResourceError &&
      !hasPolicyError &&
      isLocalRepoInSync &&
      versionInProd !== versionInGitea
    ) {
      return true;
    }
    return false;
  };

  const displayContent = () => {
    if (isLoading) {
      return (
        <div className={classes.spinnerWrapper}>
          <Spinner size='3xLarge' variant='interaction' title='Laster inn policy' />
        </div>
      );
    }
    // TODO error handling
    if (hasError) {
      return <p>Beklager, det skjedde en feil under innhenting av innholdet</p>;
    }
    return (
      <>
        <h1 className={classes.pageHeader}>Publiser ressurs</h1>
        <div className={classes.contentWrapper}>
          <h2 className={classes.subHeader}>Status</h2>
          {displayStatusCard()}
          <div className={classes.newVersionWrapper}>
            <h2 className={classes.subHeader}>Nytt versjonsnummer</h2>
            <p className={classes.text}>Sett et versjonsnummer for endringene du har gjort</p>
            <div className={classes.textAndButton}>
              <div className={classes.textfield}>
                <TextField
                  placeholder='' // TODO
                  value={newVersionText}
                  onChange={(e) => setNewVersionText(e.target.value)}
                  // isValid={hasOnlyNumbers(newVersionText)} // TODO - only numbers??
                  aria-labelledby='versionnumber-field'
                />
              </div>
              <ScreenReaderSpan id='versionnumber-field' label='Nytt versjonssnummer' />
              <Button
                color='primary'
                onClick={() => {
                  // TODO - Save new version number
                  alert('todo - Save new version number');
                }}
                iconPlacement='left'
                icon={<UploadIcon title='Lagre versjonsnummer' />}
              >
                Lagre versjonsnummer
              </Button>
            </div>
          </div>
          <h2 className={classes.subHeader}>Velg miljø å publisere i</h2>
          <div className={classes.deployCardsWrapper}>
            <ResourceDeployEnvCard
              isDeployPossible={isDeployPossible('test')}
              envName='Testmiljø TT-02' //'tt02-miljøet'
              currentEnvVersion={versionInTest}
              newEnvVersion={versionInGitea !== versionInTest ? versionInGitea : undefined}
            />
            <ResourceDeployEnvCard
              isDeployPossible={isDeployPossible('prod')}
              envName='Produksjonsmiljø' //'production-miljøet'
              currentEnvVersion={versionInProd}
              newEnvVersion={versionInGitea !== versionInProd ? versionInGitea : undefined}
            />
          </div>
        </div>
      </>
    );
  };

  return <div className={classes.deployPageWrapper}>{displayContent()}</div>;
};
