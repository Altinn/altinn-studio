import React from 'react';
import classes from './AppLogs.module.css';
import { useTranslation } from 'react-i18next';
import type { DeployEnvironment } from 'app-shared/types/DeployEnvironment';
import { Heading } from '@digdir/design-system-react';
import { formatDateDDMMYY, formatTimeHHmm } from 'app-shared/pure/date-format';
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
import { BuildResult } from 'app-shared/types/Build';
import type { AppDeployment } from 'app-shared/types/api/AppDeployment';

export interface AppLogsProps {
  orgEnvironmentList: DeployEnvironment[];
  appDeployment: AppDeployment;
}

export const AppLogs = ({ orgEnvironmentList, appDeployment }: AppLogsProps) => {
  const { t } = useTranslation();

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
            const environmentType = orgEnvironmentList
              .find(
                (env: DeployEnvironment) =>
                  env.name.toLowerCase() === pipelineDeployment.envName.toLowerCase(),
              )
              ?.type.toLowerCase();
            const isProduction = environmentType.toLowerCase() === 'production';
            const envTitle = isProduction
              ? t(`general.production_environment_alt`)
              : `${t('general.test_environment_alt')} ${pipelineDeployment.envName?.toUpperCase()}`;
            return (
              <li key={pipelineDeployment.build.id}>
                <div className={classes.logTitle}>
                  {t('overview.app_logs_title', {
                    tagName: pipelineDeployment.tagName,
                    envTitle,
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
