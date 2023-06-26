import React from 'react';
import classes from './ResourceDeployEnvCard.module.css';
import { Button } from '@digdir/design-system-react';
import { ArrowRightIcon, PackageFillIcon } from '@navikt/aksel-icons';

interface Props {
  isDeployPossible: boolean;
  envName: string;
  currentEnvVersion: number;
  newEnvVersion?: number;
}

/**
 * Component for the card displaying the button for publishing the resource
 * to an environment and information about the resource version
 *
 * @param props.isDeployPossible flag for if deploy is possible or not
 * @param props.envName the name of the environment
 * @param props.currentEnvVersion the current version in the environment
 * @param props.newEnvVersion the new version the resource will deploy to
 */
export const ResourceDeployEnvCard = ({
  isDeployPossible,
  envName,
  currentEnvVersion,
  newEnvVersion,
}: Props) => {
  // TODO - Translation
  return (
    <div className={classes.cardWrapper}>
      <p className={classes.envName}>{envName}</p>
      <div className={classes.envWrapper}>
        <div className={classes.currentEnv}>
          <PackageFillIcon title={`Nåværende versjon i ${envName}`} />
          <p className={classes.currentEnvText}>v{currentEnvVersion}</p>
        </div>
        {newEnvVersion && (
          <>
            <div className={classes.arrowWrapper}>
              <ArrowRightIcon title={`Ny versjon for ${envName}`} fontSize='1.5rem' />
            </div>
            <div className={classes.newEnv}>
              <p>v{newEnvVersion}</p>
            </div>
          </>
        )}
      </div>
      <div className={classes.buttonWrapper}>
        <Button disabled={!isDeployPossible}>Publiser til miljø</Button>
      </div>
    </div>
  );
};
