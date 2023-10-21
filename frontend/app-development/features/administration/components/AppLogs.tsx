import React from 'react';
import classes from './AppLogs.module.css';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppDeploymentsQuery, useEnvironmentsQuery } from 'app-development/hooks/queries';
import { useTranslation } from 'react-i18next';
import { AltinnSpinner } from 'app-shared/components';
import { DeploymentStatus } from 'app-development/features/appPublish/components/appDeploymentComponent';
import { DeployEnvironment } from 'app-shared/types/DeployEnvironment';
import { IDeployment } from 'app-development/sharedResources/appDeployment/types';
import { Alert, Heading } from '@digdir/design-system-react';
import { formatDateTime } from 'app-shared/pure/date-format';

export const AppLogs = () => {
  const { org, app } = useStudioUrlParams();
  const { t } = useTranslation();

  const {
    data: appDeployments = [],
    isLoading: isLoadingDeploys,
    isError: deploysHasError,
  } = useAppDeploymentsQuery(org, app, { hideDefaultError: true });
  const {
    data: environmentList = [],
    isLoading: envIsLoading,
    isError: envIsError,
  } = useEnvironmentsQuery({ hideDefaultError: true });

  if (isLoadingDeploys || envIsLoading) return <AltinnSpinner />;

  if (deploysHasError || envIsError)
    return <Alert severity='danger'>{t('administration.app_logs_error')}</Alert>;

  const succeededDeployments = appDeployments.filter(
    (deployment: IDeployment) =>
      deployment.build.result === DeploymentStatus.succeeded && deployment.build.finished !== null,
  );
  const hasSucceededDeployments = succeededDeployments.length > 0;

  return (
    <div className={classes.appLogs}>
      <Heading level={2} size='xxsmall' className={classes.appLogsTitle}>
        {t('administration.activity')}
      </Heading>
      <ul className={classes.logs}>
        {hasSucceededDeployments ? (
          succeededDeployments.map((appDeployment) => {
            const environmentType = environmentList
              .find((env: DeployEnvironment) => env.name === appDeployment.envName)
              ?.type.toLowerCase();
            return (
              <li key={appDeployment.tagName}>
                <div className={classes.logTitle}>
                  {`${t('general.version')} ${appDeployment.tagName} ${t(
                    `general.${environmentType}_environment`,
                  )}${environmentType === 'test' ? ` ${appDeployment.envName.toUpperCase()}` : ''}`}
                </div>
                <div>
                  {`(${appDeployment.createdBy}) ${t('general.date')}: ${formatDateTime(
                    appDeployment.created,
                    undefined,
                    ` ${t('general.time_prefix')} `,
                  )}`}
                </div>
              </li>
            );
          })
        ) : (
          <li>{t('administration.no_activity')}</li>
        )}
      </ul>
    </div>
  );
};
