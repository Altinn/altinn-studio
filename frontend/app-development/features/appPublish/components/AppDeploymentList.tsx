import React from 'react';
import classes from './AppDeploymentList.module.css';
import { Alert, Heading, Paragraph } from '@digdir/design-system-react';
import { Table } from '@digdir/design-system-react';
import { formatDateTime } from 'app-shared/pure/date-format';
import { Trans, useTranslation } from 'react-i18next';
import classNames from 'classnames';

import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
import type { KubernetesDeployment } from 'app-shared/types/api/KubernetesDeployment';
import { BuildResult } from 'app-shared/types/Build';
import { KubernetesDeploymentStatus } from 'app-shared/types/api/KubernetesDeploymentStatus';
import { getAzureDevopsBuildResultUrl } from '../../../utils/urlHelper';
import {
  InformationSquareFillIcon,
  ExclamationmarkTriangleFillIcon,
  CheckmarkCircleFillIcon,
  XMarkOctagonFillIcon,
} from '@studio/icons';
import { StudioSpinner } from '@studio/components';

export interface AppDeploymentListProps {
  envName: string;
  pipelineDeploymentList: PipelineDeployment[];
  kubernetesDeployment?: KubernetesDeployment;
}

export const AppDeploymentList = ({
  pipelineDeploymentList,
  kubernetesDeployment,
  envName,
}: AppDeploymentListProps) => {
  const { t } = useTranslation();

  // const getSeverity = (buildResult: BuildResult) => {
  //   switch (buildResult) {
  //     case BuildResult.canceled:
  //       return 'warning';
  //     case BuildResult.failed:
  //       return 'danger';
  //     case BuildResult.partiallySucceeded:
  //       return 'warning';
  //     case BuildResult.succeeded:
  //       return 'success';
  //     case BuildResult.none:
  //     default:
  //       return '';
  //   }
  // };

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
            spinnerTitle={t('app_deploy.build_result.none')}
            showSpinnerTitle={false}
            className={classes.loadingSpinner}
          />
          // <InformationSquareFillIcon
          //   className={classNames(classes.icon, classes[`icon-${buildResult}`])}
          // />
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
    <div className={classes.appDeploymentList}>
      {pipelineDeploymentList.length === 0 ? (
        <span id={`deploy-history-for-${envName.toLowerCase()}-unavailable`}>
          {t('app_deploy_table.deployed_version_history_empty', { envName })}
        </span>
      ) : (
        <div>
          <Heading level={4} size='xxsmall' className={classes.heading}>
            {t('app_deploy_table.deployed_version_history', { envName })}
          </Heading>
          <div className={classes.tableWrapper} id={`deploy-history-table-${envName}`}>
            <Table size='small' stickyHeader className={classes.table}>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell
                    className={classNames(classes.tableHeaderCell, classes.tableIconCell)}
                  />
                  <Table.HeaderCell className={classes.tableHeaderCell}>
                    {t('app_deploy_table.status')}
                  </Table.HeaderCell>
                  <Table.HeaderCell className={classes.tableHeaderCell}>
                    {t('app_deploy_table.version_col')}
                  </Table.HeaderCell>
                  <Table.HeaderCell className={classes.tableHeaderCell}>
                    {t('app_deploy_table.available_version_col')}
                  </Table.HeaderCell>
                  <Table.HeaderCell className={classes.tableHeaderCell}>
                    {t('app_deploy_table.deployed_by_col')}
                  </Table.HeaderCell>
                  <Table.HeaderCell className={classes.tableHeaderCell} />
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
                        {t(`app_deploy.build_result.${deploy.build.result}`)}
                      </Table.Cell>
                      <Table.Cell className={classes.tableCell}>{deploy.tagName}</Table.Cell>
                      <Table.Cell className={classes.tableCell}>
                        {formatDateTime(deploy.build.finished)}
                      </Table.Cell>
                      <Table.Cell className={classes.tableCell}>{deploy.createdBy}</Table.Cell>
                      <Table.Cell className={classes.tableCell}>
                        <Trans i18nKey={'app_deploy.build_log'}>
                          <a
                            href={getAzureDevopsBuildResultUrl(deploy.build.id)}
                            target='_newTab'
                            rel='noopener noreferrer'
                          />
                        </Trans>
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
