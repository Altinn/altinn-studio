import React from 'react';
import classes from './DeploymentLogList.module.css';
import { useTranslation } from 'react-i18next';
import type { Environment } from 'app-shared/types/Environment';
import { Heading } from '@digdir/design-system-react';
import { formatDateDDMMYY, formatTimeHHmm } from 'app-shared/pure/date-format';
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
import { BuildResult } from 'app-shared/types/Build';

export interface DeploymentLogListProps {
  orgEnvironmentList: Environment[];
  pipelineDeploymentList: PipelineDeployment[];
}

export const DeploymentLogList = ({
  orgEnvironmentList,
  pipelineDeploymentList,
}: DeploymentLogListProps) => {
  const { t } = useTranslation();

  const succeededPipelineDeploymentList = pipelineDeploymentList.filter(
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
    <div className={classes.container}>
      <Heading level={2} size='xxsmall' className={classes.heading}>
        {t('overview.activity')}
      </Heading>
      <ul className={classes.logs}>
        {hasSucceededDeployments ? (
          succeededPipelineDeploymentList.map((pipelineDeployment: PipelineDeployment) => {
            const environmentType = orgEnvironmentList
              .find(
                (env: Environment) =>
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
                  {t('overview.deployment_log_list_title', {
                    tagName: pipelineDeployment.tagName,
                    envTitle,
                  })}
                </div>
                <div>
                  {t('overview.deployment_log_list_created', {
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
