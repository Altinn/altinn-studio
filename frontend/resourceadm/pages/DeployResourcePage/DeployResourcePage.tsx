import React, { useState } from 'react';
import classes from './DeployResourcePage.module.css';
import { ResourceDeployStatus } from 'resourceadm/components/ResourceDeployStatus';
import { ResourceDeployEnvCard } from 'resourceadm/components/ResourceDeployEnvCard';
import { useOnce } from 'resourceadm/hooks/useOnce';
import { TextField, Button } from '@digdir/design-system-react';

interface Props {
  isLocalRepoInSync: boolean;
}

/**
 * Displays the deploy page for resources
 *
 * @param props.isLocalRepoInSync boolean for if the local repo is in sync or not
 */
export const DeployResourcePage = ({ isLocalRepoInSync }: Props) => {
  // To manage state for if the resource is valid or not
  const [resourceIsValid, setResourceIsValid] = useState(false);

  const [currentEnvVersionTest, setCurrentEnvVersionTest] = useState('1');
  const [currentEnvVersionProd, setCurrentEnvVersionProd] = useState('1');

  // TODO - The user MUST save the version number to backend. When the version number
  // from backend is different than what is in test/prod, then it is valid.
  // Do not compare it with the text directly, it must first be saved.
  // TODO - ADD information box.
  const [newVersionText, setNewVersionText] = useState('1');

  useOnce(() => {
    // TODO - replace with API call
    setResourceIsValid(true);
    setCurrentEnvVersionTest('2');
    setCurrentEnvVersionProd('1');
  });

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
    </div>
  );
};
