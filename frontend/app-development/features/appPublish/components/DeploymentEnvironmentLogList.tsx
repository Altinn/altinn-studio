import React from 'react';
import classes from './DeploymentEnvironmentLogList.module.css';
import { Link, Table } from '@digdir/designsystemet-react';
import { DateUtils } from '@studio/pure-functions';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';

import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
import type { KubernetesDeployment } from 'app-shared/types/api/KubernetesDeployment';
import { BuildResult } from 'app-shared/types/Build';
import {
  ExclamationmarkTriangleFillIcon,
  CheckmarkCircleFillIcon,
  XMarkOctagonFillIcon,
} from '@studio/icons';
import { StudioSpinner } from '@studio/components-legacy';
import { getAzureDevopsBuildResultUrl } from 'app-development/utils/urlHelper';

export interface DeploymentEnvironmentLogListProps {
  envName: string;
  isProduction: boolean;
  pipelineDeploymentList: PipelineDeployment[];
  kubernetesDeployment?: KubernetesDeployment;
}

export const DeploymentEnvironmentLogList = ({
  envName,
  isProduction,
  pipelineDeploymentList,
}: DeploymentEnvironmentLogListProps) => {
  const { t } = useTranslation();

  const envTitle = isProduction
    ? t(`general.production_environment_alt`).toLowerCase()
    : `${t('general.test_environment_alt').toLowerCase()} ${envName?.toUpperCase()}`;

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
        return <StudioSpinner size='small' spinnerTitle='' showSpinnerTitle={false} />;
    }
  };

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
                const tableCellStatusClassName = classes[deploy.build.result];
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
                      {t(getStatusTextByDeploymentType(deploy))}
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
                        (DateUtils.isDateWithinDays(deploy.build.started, 30) ? (
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
