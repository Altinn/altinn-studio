import React from 'react';
import classes from './ResourceDeployEnvCard.module.css';
import { Button, Tag } from '@digdir/design-system-react';
import { ArrowRightIcon } from '@navikt/aksel-icons';

interface Props {
  isDeployPossible: boolean;
  envName: string;
  currentEnvVersion: string;
  newEnvVersion?: string;
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
        <Tag color='neutral' variant='outlined'>
          <p className={classes.envText}>v{currentEnvVersion}</p>
        </Tag>
        {newEnvVersion && (
          <>
            <div className={classes.arrowWrapper}>
              <ArrowRightIcon title={`Ny versjon for ${envName}`} fontSize='1.5rem' />
            </div>
            <Tag color='success' variant='outlined'>
              <p className={classes.envText}>v{newEnvVersion}</p>
            </Tag>
          </>
        )}
      </div>
      <div className={classes.buttonWrapper}>
        <Button disabled={!isDeployPossible}>Publiser til {envName}</Button>
      </div>
    </div>
  );
};
