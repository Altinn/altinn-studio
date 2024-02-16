import React from 'react';
import classes from './AppLogs.module.css';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppDeploymentsQuery, useEnvironmentsQuery } from 'app-development/hooks/queries';
import { useTranslation } from 'react-i18next';
import { StudioSpinner } from '@studio/components';
import type { DeployEnvironment } from 'app-shared/types/DeployEnvironment';
import { Alert, Heading } from '@digdir/design-system-react';
import { formatDateDDMMYY, formatTimeHHmm } from 'app-shared/pure/date-format';
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
import { BuildResult } from 'app-shared/types/Build';

export const AppLogs = () => {
  const { org, app } = useStudioUrlParams();
  const { t } = useTranslation();

  const {
    data: appDeployment,
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
    return <Alert severity='danger'>{t('overview.app_logs_error')}</Alert>;

  const succeededPipelineDeploymentList = appDeployment.pipelineDeploymentList.filter(
    (pipelineDeployment: PipelineDeployment) =>
      pipelineDeployment.build.result === BuildResult.succeeded &&
      pipelineDeployment.build.finished !== null,
  );
  const hasSucceededDeployments = succeededPipelineDeploymentList.length > 0;

  const formatDateTime = (dateAsString: string): string => {
    return t('general.date_time_format', {
      date: formatDateDDMMYY(dateAsString),
      time: formatTimeHHmm(dateAsString),
    });
  };

  return (
    <div className={classes.appLogs}>
      <Heading level={2} size='xxsmall' className={classes.appLogsTitle}>
        {t('overview.activity')}
      </Heading>
      <ul className={classes.logs}>
        {hasSucceededDeployments ? (
          succeededPipelineDeploymentList.map((pipelineDeployment: PipelineDeployment) => {
            const environmentType = environmentList
              .find((env: DeployEnvironment) => env.name === pipelineDeployment.envName)
              ?.type.toLowerCase();
            return (
              <li key={pipelineDeployment.build.id}>
                <div className={classes.logTitle}>
                  {t('overview.app_logs_title', {
                    tagName: pipelineDeployment.tagName,
                    environment: t(`general.${environmentType}`),
                    envName: pipelineDeployment.envName?.toUpperCase() || '',
                  })}
                </div>
                <div>
                  {t('overview.app_logs_created', {
                    createdBy: pipelineDeployment.createdBy,
                    createdDateTime: formatDateTime(pipelineDeployment.created),
                  })}
                </div>
              </li>
            );
          })
        ) : (
          <li>{t('overview.no_activity')}</li>
        )}
      </ul>
    </div>
  );
};
