import React from 'react';
import classes from './AppDeploymentList.module.css';
import {
  Alert,
  LegacyTable,
  LegacyTableBody,
  LegacyTableCell,
  LegacyTableHeader,
  LegacyTableRow,
} from '@digdir/design-system-react';
import { formatDateTime } from 'app-shared/pure/date-format';
import { useTranslation } from 'react-i18next';

import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
import type { KubernetesDeployment } from 'app-shared/types/api/KubernetesDeployment';
import { BuildResult } from 'app-shared/types/Build';
import { KubernetesDeploymentStatus } from 'app-shared/types/api/KubernetesDeploymentStatus';

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

  const succeededPipelineDeploymentList = pipelineDeploymentList.filter(
    (item) => item.build.result === BuildResult.succeeded && item.build.finished !== null,
  );

  // Deployment to Kubernetes succeeded but Pipeline failed
  const deployStatusUnavailable =
    kubernetesDeployment?.status === KubernetesDeploymentStatus.completed &&
    succeededPipelineDeploymentList[0]?.tagName !== kubernetesDeployment?.version;

  return (
    <div className={classes.deploymentListGrid}>
      {deployStatusUnavailable && (
        <Alert severity='warning'>
          {t('app_publish.deployment_in_env.status_missing', {
            envName,
            tagName: kubernetesDeployment.version,
          })}
        </Alert>
      )}

      {succeededPipelineDeploymentList.length === 0 ? (
        !deployStatusUnavailable && (
          <span id={`deploy-history-for-${envName.toLowerCase()}-unavailable`}>
            {t('app_deploy_table.deployed_version_history_empty', { envName })}
          </span>
        )
      ) : (
        <div>
          <div id={`deploy-history-for-${envName.toLowerCase()}-available`}>
            {t('app_deploy_table.deployed_version_history', { envName })}
          </div>
          <div className={classes.tableWrapper} id={`deploy-history-table-${envName}`}>
            <LegacyTable
              className={classes.table}
              aria-label={t('app_deploy_table.deploy_table_aria', { envName })}
            >
              <LegacyTableHeader>
                <LegacyTableRow className={classes.tableRow}>
                  <LegacyTableCell className={classes.colorBlack}>
                    {t('app_deploy_table.version_col')}
                  </LegacyTableCell>
                  <LegacyTableCell className={classes.colorBlack}>
                    {t('app_deploy_table.available_version_col')}
                  </LegacyTableCell>
                  <LegacyTableCell className={classes.colorBlack}>
                    {t('app_deploy_table.deployed_by_col')}
                  </LegacyTableCell>
                  <LegacyTableCell className={classes.colorBlack}>Status</LegacyTableCell>
                </LegacyTableRow>
              </LegacyTableHeader>
              <LegacyTableBody>
                {succeededPipelineDeploymentList.map((deploy: PipelineDeployment) => (
                  <LegacyTableRow
                    key={`${deploy.tagName}-${deploy.created}`}
                    className={classes.tableRow}
                  >
                    <LegacyTableCell>{deploy.tagName}</LegacyTableCell>
                    <LegacyTableCell>{formatDateTime(deploy.build.finished)}</LegacyTableCell>
                    <LegacyTableCell>{deploy.createdBy}</LegacyTableCell>
                  </LegacyTableRow>
                ))}
              </LegacyTableBody>
            </LegacyTable>
          </div>
        </div>
      )}
    </div>
  );
};
