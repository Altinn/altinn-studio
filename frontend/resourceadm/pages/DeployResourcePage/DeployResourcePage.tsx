import React, { useState } from 'react';
import classes from './DeployResourcePage.module.css';
import { ResourceDeployStatus } from 'resourceadm/components/ResourceDeployStatus';
import { ResourceDeployEnvCard } from 'resourceadm/components/ResourceDeployEnvCard';
import { useOnce } from 'resourceadm/hooks/useOnce';

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

  // TODO - find out what to do with this
  const isFinalTestVersionPublished = true;
  const isFinalProdVersionPublished = false;

  useOnce(() => {
    // TODO - replace with API call
    setResourceIsValid(false);
    setCurrentEnvVersionTest('1');
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
    if (resourceIsValid && type === 'test' && isFinalTestVersionPublished)
      return 'Siste versjon er allerede publisert';
    if (resourceIsValid && type === 'prod' && isFinalProdVersionPublished)
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

  return (
    <div className={classes.deployPageWrapper}>
      <h1 className={classes.pageHeader}>Publiser ressurs</h1>
      {displayStatusCard()}
      <div>
        <h2 className={classes.subHeader}>Velg miljø å publisere i</h2>
        <div className={classes.deployCardsWrapper}>
          <ResourceDeployEnvCard
            // TODO - Check the version properly
            isDeployPossible={resourceIsValid && currentEnvVersionTest === '1'}
            envName='tt02-miljøet'
            currentEnvVersion={currentEnvVersionTest}
            deploymentNotPossibleText={getDeploymentNotPossibleText('test')}
          />
          <ResourceDeployEnvCard
            // TODO - Check the version properly
            isDeployPossible={resourceIsValid && currentEnvVersionProd === '2'}
            envName='production-miljøet'
            currentEnvVersion={currentEnvVersionProd}
            deploymentNotPossibleText={getDeploymentNotPossibleText('prod')}
          />
        </div>
      </div>
    </div>
  );
};
