import React from 'react';
import classes from './ResourceDeployEnvCard.module.css';
import { Button, Tag, Paragraph } from '@digdir/design-system-react';
import { ArrowRightIcon } from '@navikt/aksel-icons';

interface Props {
  /**
   * Flag for if deploy is possible or not
   */
  isDeployPossible: boolean;
  /**
   * The name of the environment
   */
  envName: string;
  /**
   * The current version in the environment
   */
  currentEnvVersion: string;
  /**
   * The new version the resource will deploy to
   */
  newEnvVersion?: string;
}

/**
 * @component
 *    Component for the card displaying the button for publishing the resource
 *    to an environment and information about the resource version
 *
 * @property {boolean}[isDeployPossible] - Flag for if deploy is possible or not
 * @property {string}[envName] - The name of the environment
 * @property {string}[currentEnvVersion] - The current version in the environment
 * @property {string}[newEnvVersion] - The new version the resource will deploy to
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceDeployEnvCard = ({
  isDeployPossible,
  envName,
  currentEnvVersion,
  newEnvVersion,
}: Props): React.ReactNode => {
  // TODO - Translation

  const handleOnClick = () => {
    console.log('Coming soon...');
  };

  return (
    <div className={classes.cardWrapper}>
      <Paragraph size='small' className={classes.envName}>
        <strong>{envName}</strong>
      </Paragraph>
      <div className={classes.envWrapper}>
        <Tag color='neutral' variant='outlined'>
          <Paragraph size='small'>v{currentEnvVersion}</Paragraph>
        </Tag>
        {newEnvVersion && (
          <>
            <div className={classes.arrowWrapper}>
              <ArrowRightIcon title={`Ny versjon for ${envName}`} fontSize='1.5rem' />
            </div>
            <Tag color='success' variant='outlined'>
              <Paragraph size='small'>v{newEnvVersion}</Paragraph>
            </Tag>
          </>
        )}
      </div>
      <div className={classes.buttonWrapper}>
        <Button
          aria-disabled={!isDeployPossible}
          onClick={isDeployPossible ? handleOnClick : undefined}
        >
          Publiser til {envName}
        </Button>
      </div>
    </div>
  );
};
