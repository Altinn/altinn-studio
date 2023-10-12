import React from 'react';
import classes from './AppDeployments.module.css';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppDeploymentsQuery, useEnvironmentsQuery } from 'app-development/hooks/queries';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';
import { AltinnSpinner } from 'app-shared/components';
import { DeploymentStatus } from 'app-development/features/appPublish/components/appDeploymentComponent';
import { DeployEnvironment } from 'app-shared/types/DeployEnvironment';
import { IDeployment } from 'app-development/sharedResources/appDeployment/types';
import { Heading } from '@digdir/design-system-react';
import { formatDateTime } from 'app-shared/pure/date-format';

export type AppDeploymentsProps = {
  envName: string;
};

export const AppDeployments = ({ envName }: AppDeploymentsProps) => {
  const { org, app } = useStudioUrlParams();
  const { t } = useTranslation();

  const { data: appDeployments = [], isLoading: deploysAreLoading } = useAppDeploymentsQuery(
    org,
    app,
  );
  const { data: environmentList = [], isLoading: envIsLoading } = useEnvironmentsQuery();

  if (deploysAreLoading || envIsLoading) return <AltinnSpinner />;

  const deployHistory: IDeployment[] = appDeployments.filter((x) => x.envName === envName);

  const succeededDeployments = deployHistory.filter(
    (deployment: IDeployment) =>
      deployment.build.result === DeploymentStatus.succeeded && deployment.build.finished !== null,
  );
  const hasSucceededDeployments = succeededDeployments.length > 0;

  return (
    <div className={classes.appDeployments}>
      <Heading level={2} size='xxsmall' className={classes.appDeploymentsTitle}>
        {t('administration.latest_published_versions')}
      </Heading>
      {hasSucceededDeployments ? (
        <ul className={classes.versions}>
          {succeededDeployments.map((appDeployment) => {
            const environmentType = environmentList
              .find((env: DeployEnvironment) => env.name === appDeployment.envName)
              ?.type.toLowerCase();
            return (
              <li key={appDeployment.tagName}>
                <div className={classes.versionTitle}>
                  {t('general.version')} {appDeployment.tagName}{' '}
                  {t(`general.${environmentType}_environment`)}
                  {environmentType === 'test' && ` ${appDeployment.envName.toUpperCase()}`}
                </div>
                <div>
                  {`(${appDeployment.createdBy}) ${t('general.date')}: ${formatDateTime(
                    appDeployment.created,
                    null,
                    ' kl. ',
                  )} ${t('general.time_prefix')}`}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className={classes.noPublishedVersions}>
          {t('administration.no_published_versions')}
        </div>
      )}
    </div>
  );
};
