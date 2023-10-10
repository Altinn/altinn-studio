import React from 'react';
import classes from './ResourceDeployEnvCard.module.css';
import { Button, Tag, Paragraph, Spinner } from '@digdir/design-system-react';
import { ArrowRightIcon } from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';

export type ResourceDeployEnvCardProps = {
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
  /**
   * Function to be executed on click
   * @returns void
   */
  onClick: () => void;
  loading: boolean;
};

/**
 * @component
 *    Component for the card displaying the button for publishing the resource
 *    to an environment and information about the resource version
 *
 * @property {boolean}[isDeployPossible] - Flag for if deploy is possible or not
 * @property {string}[envName] - The name of the environment
 * @property {string}[currentEnvVersion] - The current version in the environment
 * @property {string}[newEnvVersion] - The new version the resource will deploy to
 * @property {function}[onClick] - Function to be executed on click
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceDeployEnvCard = ({
  isDeployPossible,
  envName,
  currentEnvVersion,
  newEnvVersion,
  onClick,
  loading,
}: ResourceDeployEnvCardProps): React.ReactNode => {
  const { t } = useTranslation();

  return (
    <div className={classes.cardWrapper}>
      {loading ? (
        <Spinner title={t('resourceadm.deploy_deploying')}></Spinner>
      ) : (
        <>
          <Paragraph size='small' className={classes.envName}>
            <strong>{envName}</strong>
          </Paragraph>
          <Paragraph size='small' className={classes.versionNumberText}>
            {t('resourceadm.deploy_version_number_text')}
          </Paragraph>
          <div className={classes.envWrapper}>
            <Tag color='neutral' variant='outlined' size='small'>
              {currentEnvVersion}
            </Tag>
            {newEnvVersion && (
              <>
                <div className={classes.arrowWrapper}>
                  <ArrowRightIcon
                    title={t('resourceadm.deploy_card_arrow_icon', { env: envName })}
                    fontSize='1.5rem'
                  />
                </div>
                <Tag color='success' variant='outlined' size='small'>
                  {newEnvVersion}
                </Tag>
              </>
            )}
          </div>
          <div className={classes.buttonWrapper}>
            <Button
              aria-disabled={!isDeployPossible}
              onClick={() => (isDeployPossible ? onClick() : undefined)}
              size='small'
            >
              {t('resourceadm.deploy_card_publish', { env: envName })}
            </Button>
          </div>{' '}
        </>
      )}
    </div>
  );
};
