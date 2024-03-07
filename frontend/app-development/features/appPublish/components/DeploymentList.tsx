import React from 'react';
import classes from './DeploymentList.module.css';
import { Heading, Link, Table } from '@digdir/design-system-react';
import { formatDateTime, isDateWithinDays } from 'app-shared/pure/date-format';
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
import { StudioSpinner } from '@studio/components';
import { getAzureDevopsBuildResultUrl } from 'app-development/utils/urlHelper';

export interface DeploymentListProps {
  envName: string;
  isProduction: boolean;
  pipelineDeploymentList: PipelineDeployment[];
  kubernetesDeployment?: KubernetesDeployment;
}

export const DeploymentList = ({
  envName,
  isProduction,
  pipelineDeploymentList,
}: DeploymentListProps) => {
  const { t } = useTranslation();

  const envTitle = isProduction
    ? t(`general.production_environment_alt`).toLowerCase()
    : `${t('general.test_environment_alt').toLowerCase()} ${envName?.toUpperCase()}`;

  const getIcon = (buildResult: BuildResult) => {
    switch (buildResult) {
      case BuildResult.failed:
        return (
          <XMarkOctagonFillIcon
            className={classNames(classes.icon, classes[`icon-${buildResult}`])}
          />
        );
      case BuildResult.canceled:
      case BuildResult.partiallySucceeded:
        return (
          <ExclamationmarkTriangleFillIcon
            className={classNames(classes.icon, classes[`icon-${buildResult}`])}
          />
        );
      case BuildResult.succeeded:
        return (
          <CheckmarkCircleFillIcon
            className={classNames(classes.icon, classes.icon, classes[`icon-${buildResult}`])}
          />
        );
      case BuildResult.none:
      default:
        return (
          <StudioSpinner
            size='small'
            spinnerTitle=''
            showSpinnerTitle={false}
            className={classes.loadingSpinner}
          />
        );
    }
  };

  const getClassName = (buildResult: BuildResult) => {
    switch (buildResult) {
      case BuildResult.canceled:
        return classes.canceled;
      case BuildResult.failed:
        return classes.failed;
      case BuildResult.partiallySucceeded:
        return classes.partiallySucceeded;
      case BuildResult.succeeded:
        return classes.succeeded;
      case BuildResult.none:
      default:
        return classes.none;
    }
  };

  return (
    <div className={classes.container}>
      {pipelineDeploymentList.length === 0 ? (
        <span id={`deploy-history-for-${envName.toLowerCase()}-unavailable`}>
          {t('app_deployment.table.deployed_version_history_empty', { envTitle })}
        </span>
      ) : (
        <div>
          <Heading level={4} size='xxsmall' className={classes.heading}>
            {t('app_deployment.table.deployed_version_history', { envTitle })}
          </Heading>
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
                  return (
                    <Table.Row key={deploy.build.id} className={getClassName(deploy.build.result)}>
                      <Table.Cell className={classNames(classes.tableCell, classes.tableIconCell)}>
                        {getIcon(deploy.build.result)}
                      </Table.Cell>
                      <Table.Cell className={classes.tableCell}>
                        {t(
                          `app_deployment.pipeline_deployment.build_result.${deploy.build.result}`,
                        )}
                      </Table.Cell>
                      <Table.Cell className={classes.tableCell}>{deploy.tagName}</Table.Cell>
                      <Table.Cell className={classes.tableCell}>
                        {deploy.build.finished && formatDateTime(deploy.build.finished)}
                      </Table.Cell>
                      <Table.Cell className={classes.tableCell}>{deploy.createdBy}</Table.Cell>
                      <Table.Cell className={classes.tableCell}>
                        {isDateWithinDays(deploy.build.started, 30) ? (
                          <Link
                            href={getAzureDevopsBuildResultUrl(deploy.build.id)}
                            target='_newTab'
                            rel='noopener noreferrer'
                          >
                            {t('app_deployment.table.build_log_active_link')}
                          </Link>
                        ) : (
                          t('app_deployment.table.build_log_expired_link')
                        )}
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};
