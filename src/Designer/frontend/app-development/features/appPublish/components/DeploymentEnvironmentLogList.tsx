import React from 'react';
import classes from './DeploymentEnvironmentLogList.module.css';
import { Link, Table } from '@digdir/designsystemet-react';
import { DateUtils } from '@studio/pure-functions';
import { Trans, useTranslation } from 'react-i18next';
import classNames from 'classnames';

import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
import type { KubernetesDeployment } from 'app-shared/types/api/KubernetesDeployment';
import { BuildResult } from 'app-shared/types/Build';
import {
  ExclamationmarkTriangleFillIcon,
  CheckmarkCircleFillIcon,
  XMarkOctagonFillIcon,
  ExternalLinkIcon,
} from '@studio/icons';
import { StudioLink, StudioSpinner } from '@studio/components';
import { getAzureDevopsBuildResultUrl } from 'app-development/utils/urlHelper';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { grafanaPodLogsUrl } from 'app-shared/ext-urls';

export interface DeploymentEnvironmentLogListProps {
  envName: string;
  isProduction: boolean;
  pipelineDeploymentList: PipelineDeployment[];
  kubernetesDeployment?: KubernetesDeployment;
}

const getIcon = (buildResult: BuildResult) => {
  const classnames = classNames(classes.icon, classes[`${buildResult}Icon`]);
  switch (buildResult) {
    case BuildResult.failed:
      return <XMarkOctagonFillIcon className={classnames} />;
    case BuildResult.canceled:
    case BuildResult.partiallySucceeded:
      return <ExclamationmarkTriangleFillIcon className={classnames} />;
    case BuildResult.succeeded:
      return <CheckmarkCircleFillIcon className={classnames} />;
    case BuildResult.none:
    default:
      return <StudioSpinner aria-hidden spinnerTitle='' />;
  }
};

export const DeploymentEnvironmentLogList = ({
  envName,
  isProduction,
  pipelineDeploymentList,
}: DeploymentEnvironmentLogListProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();

  const envTitle = isProduction
    ? t(`general.production_environment_alt`).toLowerCase()
    : `${t('general.test_environment_alt').toLowerCase()} ${envName?.toUpperCase()}`;

  return (
    <div className={classes.container}>
      {pipelineDeploymentList.length === 0 ? (
        <div id={`deploy-history-for-${envName.toLowerCase()}-unavailable`}>
          {t('app_deployment.table.deployed_version_history_empty', { envTitle })}
        </div>
      ) : (
        <div className={classes.tableWrapper} id={`deploy-history-table-${envName}`}>
          <Table size='small' stickyHeader className={classes.table}>
            <Table.Head>
              <Table.Row>
                <Table.HeaderCell
                  className={classNames(classes.tableHeaderCell, classes.tableIconCell)}
                />
                <Table.HeaderCell className={classes.tableHeaderCell}>
                  {t('app_deployment.table.status')}
                </Table.HeaderCell>
                <Table.HeaderCell className={classes.tableHeaderCell}>
                  {t('app_deployment.table.version_col')}
                </Table.HeaderCell>
                <Table.HeaderCell className={classes.tableHeaderCell}>
                  {t('app_deployment.table.available_version_col')}
                </Table.HeaderCell>
                <Table.HeaderCell className={classes.tableHeaderCell}>
                  {t('app_deployment.table.deployed_by_col')}
                </Table.HeaderCell>
                <Table.HeaderCell className={classes.tableHeaderCell}>
                  {t('app_deployment.table.build_log')}
                </Table.HeaderCell>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {pipelineDeploymentList.map((deploy: PipelineDeployment) => {
                const areLogsAvailable = DateUtils.isDateWithinDays(deploy.build.started, 30);

                const tableCellStatusClassName = classes[deploy.build.result];
                const buildStartTime = deploy.build.started
                  ? new Date(deploy.build.started).getTime()
                  : undefined;
                const buildFinishTime = deploy.build.finished
                  ? new Date(deploy.build.finished).getTime()
                  : undefined;

                return (
                  <Table.Row key={deploy.build.id} className={tableCellStatusClassName}>
                    <Table.Cell
                      className={classNames(
                        classes.tableCell,
                        classes.tableIconCell,
                        tableCellStatusClassName,
                      )}
                    >
                      {getIcon(deploy.build.result)}
                    </Table.Cell>
                    <Table.Cell className={classNames(classes.tableCell, tableCellStatusClassName)}>
                      {deploy.deploymentType === 'Deploy' &&
                      deploy.build.result === BuildResult.failed &&
                      areLogsAvailable ? (
                        <span>
                          <Trans
                            i18nKey={`app_deployment.pipeline_deployment.build_result.failed.details`}
                            components={{
                              grafana: (
                                <StudioLink
                                  href={grafanaPodLogsUrl({
                                    org,
                                    env: envName,
                                    app,
                                    isProduction,
                                    buildStartTime,
                                    buildFinishTime,
                                  })}
                                  rel='noopener noreferrer'
                                  target='_blank'
                                  icon={
                                    <ExternalLinkIcon title={t('general.open_app_in_new_window')} />
                                  }
                                  iconPlacement={'right'}
                                >
                                  Grafana
                                </StudioLink>
                              ),
                              buildLog: (
                                <StudioLink
                                  href={getAzureDevopsBuildResultUrl(deploy.build.id)}
                                  rel='noopener noreferrer'
                                  target='_blank'
                                  icon={
                                    <ExternalLinkIcon title={t('general.open_app_in_new_window')} />
                                  }
                                  iconPlacement={'right'}
                                >
                                  Build log
                                </StudioLink>
                              ),
                            }}
                          />
                        </span>
                      ) : (
                        t(getStatusTextByDeploymentType(deploy))
                      )}
                    </Table.Cell>
                    <Table.Cell className={classNames(classes.tableCell, tableCellStatusClassName)}>
                      {deploy.tagName}
                    </Table.Cell>
                    <Table.Cell className={classNames(classes.tableCell, tableCellStatusClassName)}>
                      {deploy.build.finished && DateUtils.formatDateTime(deploy.build.finished)}
                    </Table.Cell>
                    <Table.Cell className={classNames(classes.tableCell, tableCellStatusClassName)}>
                      {deploy.createdBy}
                    </Table.Cell>
                    <Table.Cell className={classNames(classes.tableCell, tableCellStatusClassName)}>
                      {deploy.build.started &&
                        (areLogsAvailable ? (
                          <Link
                            href={getAzureDevopsBuildResultUrl(deploy.build.id)}
                            target='_newTab'
                            rel='noopener noreferrer'
                          >
                            {t('app_deployment.table.build_log_active_link')}
                          </Link>
                        ) : (
                          t('app_deployment.table.build_log_expired_link')
                        ))}
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        </div>
      )}
    </div>
  );
};

function getStatusTextByDeploymentType(deployment: PipelineDeployment): string {
  const isUndeploy = deployment.deploymentType === 'Decommission';
  const deploymentResult = deployment.build.result;
  return isUndeploy
    ? `app_deployment.pipeline_undeploy.build_result.${deploymentResult}`
    : `app_deployment.pipeline_deployment.build_result.${deploymentResult}`;
}
