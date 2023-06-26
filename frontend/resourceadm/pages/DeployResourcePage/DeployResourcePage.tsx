import React, { useEffect, useState } from 'react';
import classes from './DeployResourcePage.module.css';
import { ResourceDeployStatus } from 'resourceadm/components/ResourceDeployStatus';
import { ResourceDeployEnvCard } from 'resourceadm/components/ResourceDeployEnvCard';
import { useOnce } from 'resourceadm/hooks/useOnce';
import { TextField, Button } from '@digdir/design-system-react';
import { get } from 'app-shared/utils/networking';
import { getValidatePolicyUrlBySelectedContextRepoAndId } from 'resourceadm/utils/backendUrlUtils';
import { useParams } from 'react-router-dom';
import { PolicyErrorType } from 'resourceadm/types/global';
import { mapPolicyErrorsFromBackend } from 'resourceadm/utils/mapperUtils';
import { useRepoStatusQuery } from 'resourceadm/hooks/queries';

/**
 * Displays the deploy page for resources
 *
 * @param props.isLocalRepoInSync boolean for if the local repo is in sync or not
 */
export const DeployResourcePage = () => {
  const { selectedContext, resourceId } = useParams();
  const repo = `${selectedContext}-resources`;

  // To manage state for if the resource is valid or not
  const [resourceIsValid, setResourceIsValid] = useState(false);

  const [currentEnvVersionTest, setCurrentEnvVersionTest] = useState('1');
  const [currentEnvVersionProd, setCurrentEnvVersionProd] = useState('1');

  const [isLoading, setIsLoading] = useState(false);
  const [isLocalRepoInSync, setIsLocalRepoInSync] = useState(false);

  // TODO - Find out how the error response looks like
  const [hasResourceError, setHasResourceError] = useState(false);

  const { data: repoStatus } = useRepoStatusQuery(selectedContext, repo);

  const [policyErrors, setPolicyErrors] = useState<PolicyErrorType[]>([]);

  // TODO - The user MUST save the version number to backend. When the version number
  // from backend is different than what is in test/prod, then it is valid.
  // Do not compare it with the text directly, it must first be saved.
  // TODO - ADD information box.
  const [newVersionText, setNewVersionText] = useState('1');

  useOnce(() => {
    get(getValidatePolicyUrlBySelectedContextRepoAndId(selectedContext, repo, resourceId))
      .then((res: unknown) => {
        console.log(res);
        setPolicyErrors(mapPolicyErrorsFromBackend(res));
      })
      .catch((err) => console.log(err));

    // TODO - Get errors in resource

    // TODO - replace with API call
    setResourceIsValid(true);
    setCurrentEnvVersionTest('2');
    setCurrentEnvVersionProd('1');
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

  /**
   * Based on if the resource is valid and if the final type is
   * published it returns the text to be displayed in the publish cards
   *
   * @param type if it is test of prod
   *
   * @returns the text to display
   */
  const getDeploymentNotPossibleText = (type: 'test' | 'prod'): string => {
    if (!resourceIsValid) return '';
    if (
      resourceIsValid &&
      type === 'test' &&
      newVersionText === currentEnvVersionTest &&
      isLocalRepoInSync
    )
      return 'Siste versjon er allerede publisert';
    if (
      resourceIsValid &&
      type === 'prod' &&
      newVersionText === currentEnvVersionProd &&
      isLocalRepoInSync
    )
      return 'Siste versjon er allerede publisert';
    return '';
  };

  /**
   * Gets the message to be displayed in the status card
   *
   * @returns the message to display
   */
  const getStatusCardMessage = (): string => {
    if (!isLocalRepoInSync) {
      return 'Lokalt repo er ikke i sync med remote repo. Vennligst last opp og hent ned slik at du er i sync.';
    } else {
      if (resourceIsValid) {
        return 'Ingen feil i ressursen.';
      } else {
        return 'Det er feil i ressursen - TODO - LIST ALL';
      }
    }
  };

  /**
   * Gets either danger or success for the card type
   *
   * @returns danger or success
   */
  const getStatusCardType = (): 'danger' | 'success' => {
    if (!isLocalRepoInSync || !resourceIsValid) return 'danger';
    return 'success';
  };

  /**
   * Displays a spinner when loading the status or displays the status card
   */
  const displayStatusCard = () => {
    return <ResourceDeployStatus type={getStatusCardType()} message={getStatusCardMessage()} />;
  };

  /**
   * Checks that the version number entered contains only numbers
   *
   * @param value the string to check
   *
   * @returns a boolean for if it has only numbers
   */
  const hasOnlyNumbers = (value: string): boolean => {
    const regex = /^[0-9]+$/;
    return regex.test(value);
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
      hasOnlyNumbers(newVersionText) &&
      resourceIsValid &&
      isLocalRepoInSync &&
      newVersionText !== currentEnvVersionTest
    ) {
      return true;
    }
    if (
      type === 'prod' &&
      hasOnlyNumbers(newVersionText) &&
      resourceIsValid &&
      isLocalRepoInSync &&
      newVersionText !== currentEnvVersionProd
    ) {
      return true;
    }
    return false;
  };

  return (
    <div className={classes.deployPageWrapper}>
      <h1 className={classes.pageHeader}>Publiser ressurs</h1>
      {displayStatusCard()}
      <div>
        <div className={classes.newVersionWrapper}>
          <p className={classes.newVersionText}>Versjonsnummer for ressurs og policy</p>
          <div className={classes.textAndButton}>
            <div className={classes.textfield}>
              <TextField
                placeholder='1' // TODO
                value={newVersionText}
                onChange={(e) => setNewVersionText(e.target.value)}
                isValid={hasOnlyNumbers(newVersionText)} // TODO - only numbers??
              />
            </div>
            <Button color='secondary'>Oppdater versjon</Button>
          </div>
        </div>
        <h2 className={classes.subHeader}>Velg miljø å publisere i</h2>
        <div className={classes.deployCardsWrapper}>
          <ResourceDeployEnvCard
            isDeployPossible={isDeployPossible('test')}
            envName='tt02-miljøet'
            currentEnvVersion={currentEnvVersionTest}
            deploymentNotPossibleText={getDeploymentNotPossibleText('test')}
          />
          <ResourceDeployEnvCard
            isDeployPossible={isDeployPossible('prod')}
            envName='production-miljøet'
            currentEnvVersion={currentEnvVersionProd}
            deploymentNotPossibleText={getDeploymentNotPossibleText('prod')}
          />
        </div>
      </div>
      {policyErrors.map((p, key) => (
        <p key={key}>
          ruleNumber: {p.ruleNumber} --- errors: {p.errors.map((e) => e + ', ')}
        </p>
      ))}
      <p>Localrepo in sync: {isLocalRepoInSync}</p>
    </div>
  );
};
