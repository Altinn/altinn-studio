import React from 'react';
import classes from './DeploymentEnvironmentLogList.module.css';
import { Link, Table } from '@digdir/designsystemet-react';
import { DateUtils } from '@studio/pure-functions';
import { Trans, useTranslation } from 'react-i18next';
import classNames from 'classnames';

import { getDeployStatus, type PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
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
      return <StudioSpinner aria-hidden spinnerTitle='' data-size='sm' className={classnames} />;
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
    <>
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
                const deploymentStatus = getDeployStatus(deploy);
                const areLogsAvailable = DateUtils.isDateWithinDays(deploy.build.started, 30);

                const tableCellStatusClassName = classes[deploymentStatus];

                return (
                  <Table.Row key={deploy.build.id} className={tableCellStatusClassName}>
                    <Table.Cell
                      className={classNames(
                        classes.tableCell,
                        classes.tableIconCell,
                        tableCellStatusClassName,
                      )}
                    >
                      {getIcon(deploymentStatus)}
                    </Table.Cell>
                    <Table.Cell
                      className={classNames(
                        classes.tableCell,
                        tableCellStatusClassName,
                        classes.statusCell,
                      )}
                    >
                      {deploy.deploymentType === 'Deploy' &&
                      deploymentStatus === BuildResult.failed &&
                      areLogsAvailable ? (
                        <span>
                          <Trans
                            i18nKey={`app_deployment.pipeline_deployment.build_result.failed.details`}
                            components={{
                              grafana: (() => {
                                const deployStart =
                                  deploy.events.at(0)?.created ?? deploy.build.started;
                                const deployStartTime = new Date(deployStart).getTime();

                                const deployFinish =
                                  deploy.events.at(-1)?.created ?? deploy.build.finished;
                                const deployFinishTime = deployFinish
                                  ? new Date(deployFinish).getTime()
                                  : undefined;

                                return (
                                  <StudioLink
                                    href={grafanaPodLogsUrl({
                                      org,
                                      env: envName,
                                      app,
                                      isProduction,
                                      deployStartTime,
                                      deployFinishTime,
                                    })}
                                    rel='noopener noreferrer'
                                    target='_blank'
                                    icon={
                                      <ExternalLinkIcon
                                        title={t('general.open_app_in_new_window')}
                                      />
                                    }
                                    iconPlacement={'right'}
                                  >
                                    Grafana
                                  </StudioLink>
                                );
                              })(),
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
                        t(getStatusTextByDeploymentType(deploy, deploymentStatus))
                      )}
                      {deploy.events.length > 0 && (
                        <details className={classes.eventsDetails}>
                          <summary>{t('app_deployment.events')}</summary>
                          <ul className={classes.events}>
                            {deploy.events.map((event) => (
                              <li key={event.created + event.eventType} className={classes.event}>
                                <time className={classes.eventCreatedDate} dateTime={event.created}>
                                  {DateUtils.formatDateTime(event.created)}
                                </time>
                                <pre className={classes.eventMessage}>{event.message}</pre>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </Table.Cell>
                    <Table.Cell
                      className={classNames(
                        classes.tableCell,
                        tableCellStatusClassName,
                        classes.versionCell,
                      )}
                    >
                      {deploy.tagName}
                    </Table.Cell>
                    <Table.Cell
                      className={classNames(
                        classes.tableCell,
                        tableCellStatusClassName,
                        classes.finishedDateCell,
                      )}
                    >
                      {deploy.build.finished && DateUtils.formatDateTime(deploy.build.finished)}
                    </Table.Cell>
                    <Table.Cell
                      className={classNames(
                        classes.tableCell,
                        tableCellStatusClassName,
                        classes.deployedByCell,
                      )}
                    >
                      {deploy.createdBy}
                    </Table.Cell>
                    <Table.Cell
                      className={classNames(
                        classes.tableCell,
                        tableCellStatusClassName,
                        classes.buildLogCell,
                      )}
                    >
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
    </>
  );
};

function getStatusTextByDeploymentType(
  deployment: PipelineDeployment,
  deploymentStatus: BuildResult,
): string {
  const isUndeploy = deployment.deploymentType === 'Decommission';
  return isUndeploy
    ? `app_deployment.pipeline_undeploy.build_result.${deploymentStatus}`
    : `app_deployment.pipeline_deployment.build_result.${deploymentStatus}`;
}
