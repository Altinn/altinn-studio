import React from 'react';
import classes from './ResourceDeployEnvCard.module.css';
import { Button } from '@digdir/design-system-react';

interface Props {
  isDeployPossible: boolean;
  envName: string;
  currentEnvVersion: string;
  deploymentNotPossibleText: string;
}

export const ResourceDeployEnvCard = ({
  isDeployPossible,
  envName,
  currentEnvVersion,
  deploymentNotPossibleText,
}: Props) => {
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
