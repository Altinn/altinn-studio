import React from 'react';
import classes from './AppLogs.module.css';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppDeploymentsQuery, useEnvironmentsQuery } from 'app-development/hooks/queries';
import { useTranslation } from 'react-i18next';
import { StudioSpinner } from '@studio/components';
import { DeploymentStatus } from 'app-development/features/appPublish/components/appDeploymentComponent';
import { DeployEnvironment } from 'app-shared/types/DeployEnvironment';
import { IDeployment } from 'app-development/sharedResources/appDeployment/types';
import { Alert, Heading } from '@digdir/design-system-react';
import { formatDateDDMMYY, formatTimeHHmm } from 'app-shared/pure/date-format';

export const AppLogs = () => {
  const { org, app } = useStudioUrlParams();
  const { t } = useTranslation();

  const {
    data: appDeployments = [],
    isPending: isPendingDeploys,
    isError: deploysHasError,
  } = useAppDeploymentsQuery(org, app, { hideDefaultError: true });

  const {
    data: environmentList = [],
    isPending: envIsPending,
    isError: envIsError,
  } = useEnvironmentsQuery({ hideDefaultError: true });

  if (isPendingDeploys || envIsPending) return <StudioSpinner />;

  if (deploysHasError || envIsError)
    return <Alert severity='danger'>{t('administration.app_logs_error')}</Alert>;

  const succeededDeployments = appDeployments.filter(
    (deployment: IDeployment) =>
      deployment.build.result === DeploymentStatus.succeeded && deployment.build.finished !== null,
  );
  const hasSucceededDeployments = succeededDeployments.length > 0;

  const formatDateTime = (dateAsString: string): string => {
    return t('general.date_time_format', {
      date: formatDateDDMMYY(dateAsString),
      time: formatTimeHHmm(dateAsString),
    });
  };

  const keyToTranslationMap: Record<string, string> = {
    production: t('general.production_environment'),
  };

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
                  {t('administration.app_logs_title', {
                    tagName: appDeployment.tagName,
                    environment: keyToTranslationMap[environmentType],
                    envName: appDeployment.envName?.toUpperCase() || '',
                  })}
                </div>
                <div>
                  {t('administration.app_logs_created', {
                    createdBy: appDeployment.createdBy,
                    createdDateTime: formatDateTime(appDeployment.created),
                  })}
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
