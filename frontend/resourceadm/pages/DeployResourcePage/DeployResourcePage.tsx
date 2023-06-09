import React, { useState } from 'react';
import classes from './DeployResourcePage.module.css';
import { ResourceDeployStatus } from 'resourceadm/components/ResourceDeployStatus';
import { useOnce } from 'resourceadm/hooks/useOnce';
import { ResourceDeployEnvCard } from 'resourceadm/components/ResourceDeployEnvCard';

export const DeployResourcePage = () => {
  // To manage state for when the page is loading if it is valid
  const [isValidatingResource, setIsValidatingResource] = useState(false);

  // To manage state for if the resource is valid or not
  const [resourceIsValid, setResourceIsValid] = useState(false);

  const [currentEnvVersionTest, setCurrentEnvVersionTest] = useState('1');
  const [currentEnvVersionProd, setCurrentEnvVersionProd] = useState('1');

  const isFinalTestVersionPublished = true;
  const isFinalProdVersionPublished = false;

  const [isLocalRepoInSync, setIsLocalRepoInSync] = useState(false);

  useOnce(() => {
    // TODO - API call to backend to get validation
  });

  const getDeploymentNotPossibleText = (type: 'test' | 'prod'): string => {
    if (!resourceIsValid) return '';
    if (resourceIsValid && type === 'test' && isFinalTestVersionPublished)
      return 'Siste versjon er allerede publisert';
    if (resourceIsValid && type === 'prod' && isFinalProdVersionPublished)
      return 'Siste versjon er allerede publisert';
    return '';
  };

  const getStatusCardMessage = (): string => {
    if (!isLocalRepoInSync)
      return 'Lokalt repo er ikke i sync med remote repo. Vennligst last opp og hent ned slik at du er i sync.';
    else {
      if (resourceIsValid) return 'Ingen feil i ressursen.';
      else 'Det er feil i ressursen - TODO - LIST ALL';
    }
  };

  const getStatusCardType = (): 'alert' | 'success' => {
    if (!isLocalRepoInSync || !resourceIsValid) return 'alert';
    return 'success';
  };

  return (
    <div className={classes.deployPageWrapper}>
      <h1 className={classes.pageHeader}>Publiser ressurs</h1>
      <ResourceDeployStatus type={getStatusCardType()} message={getStatusCardMessage()} />
      <div>
        <h2 className={classes.subHeader}>Velg miljø å publisere i</h2>
        <div className={classes.deployCardsWrapper}>
          <ResourceDeployEnvCard
            isDeployPossible={resourceIsValid && currentEnvVersionTest === '1'}
            envName='tt02-miljøet'
            currentEnvVersion={currentEnvVersionTest}
            deploymentNotPossibleText={getDeploymentNotPossibleText('test')}
          />
          <ResourceDeployEnvCard
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
