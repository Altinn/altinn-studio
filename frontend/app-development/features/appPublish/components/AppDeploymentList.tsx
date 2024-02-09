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
import { PipelineDeploymentBuildResult } from 'app-shared/types/api/PipelineDeploymentBuild';

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

  const deployedApp = pipelineDeploymentList.find(
    (item) => item.tagName.toLowerCase() === kubernetesDeployment?.version,
  );
  const deployStatusUnavailable =
    deployedApp?.build?.result === PipelineDeploymentBuildResult.failed;

  return (
    <div className={classes.deploymentListGrid}>
      {pipelineDeploymentList.length === 0 ? (
        deployStatusUnavailable ? (
          <Alert severity='warning'>
            {t('app_publish.deployment_in_env.status_missing', {
              // envName: latestDeploy.envName,
              // tagName: latestDeploy.tagName,
            })}
          </Alert>
        ) : (
          <span id={`deploy-history-for-${envName.toLowerCase()}-unavailable`}>
            {t('app_deploy_table.deployed_version_history_empty', { envName })}
          </span>
        )
      ) : (
        <>
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
                {pipelineDeploymentList.map((deploy: PipelineDeployment) => (
                  <LegacyTableRow
                    key={`${deploy.tagName}-${deploy.created}`}
                    className={classes.tableRow}
                  >
                    <LegacyTableCell>{deploy.tagName}</LegacyTableCell>
                    <LegacyTableCell>{formatDateTime(deploy.build.finished)}</LegacyTableCell>
                    <LegacyTableCell>{deploy.createdBy}</LegacyTableCell>
                    <LegacyTableCell>
                      {t(`app_deploy.build_status.${deploy.build?.status}`)}
                    </LegacyTableCell>
                  </LegacyTableRow>
                ))}
              </LegacyTableBody>
            </LegacyTable>
          </div>
        </>
      )}
    </div>
  );
};
