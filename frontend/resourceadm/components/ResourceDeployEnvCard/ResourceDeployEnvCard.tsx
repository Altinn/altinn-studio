import React from 'react';
import classes from './ResourceDeployEnvCard.module.css';
import { Button } from '@digdir/design-system-react';

interface Props {
  isDeployPossible: boolean;
  envName: string;
  currentEnvVersion: string;
  deploymentNotPossibleText: string;
}

/**
 * Component for the card displaying the button for publishing the resource
 * to an environment and information about the resource version
 *
 * @param props.isDeployPossible flag for if deploy is possible or not
 * @param props.envName the name of the environment
 * @param props.currentEnvVersion the current version in the environment
 * @param props.deploymentNotPossibleText text to display if the deployment is not possible
 */
export const ResourceDeployEnvCard = ({
  isDeployPossible,
  envName,
  currentEnvVersion,
  deploymentNotPossibleText,
}: Props) => {
  // TODO - Translation
  return (
    <div className={classes.cardWrapper}>
      <p className={classes.envName}>Miljø: {envName}</p>
      <p className={classes.versionText}>
        Ute i miljøet:
        <strong> Versjon {currentEnvVersion}</strong>
      </p>
      <p className={classes.deploymentNotPossible}>
        {isDeployPossible ? ' ' : deploymentNotPossibleText}
      </p>
      <div className={classes.buttonWrapper}>
        <Button disabled={!isDeployPossible}>Publiser ressursen til miljø</Button>
      </div>
    </div>
  );
};
