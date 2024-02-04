import React, { useEffect, useMemo } from 'react';
import classes from './AppDeployment.module.css';
import {
  Alert,
  LegacyTable,
  LegacyTableBody,
  LegacyTableCell,
  LegacyTableHeader,
  LegacyTableRow,
  Link,
} from '@digdir/design-system-react';
import { formatDateTime } from 'app-shared/pure/date-format';
import { useCreateDeploymentMutation } from '../../../hooks/mutations';
import { useTranslation, Trans } from 'react-i18next';

import type { IDeployment } from '../../../sharedResources/appDeployment/types';
import { toast } from 'react-toastify';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { DeploymentStatus } from './DeploymentStatus';

export interface AppDeploymentListProps {
  deployHistory?: IDeployment[];
  deployPermission: boolean;
  envName: string;
}

export const AppDeploymentList = ({
  deployHistory,
  deployPermission,
  envName,
}: AppDeploymentListProps) => {
  const { t } = useTranslation();

  const { org, app } = useStudioUrlParams();
  const mutation = useCreateDeploymentMutation(org, app, { hideDefaultError: true });

  const succeededDeployHistory = useMemo(
    () =>
      deployHistory.filter(
        (deployment: IDeployment) =>
          deployment.build.result === DeploymentStatus.completed &&
          deployment.build.finished !== null,
      ),
    [deployHistory],
  );

  const latestDeploy = deployHistory ? deployHistory[0] : null;
  const deploymentInEnv = deployHistory ? deployHistory.find((d) => d.deployedInEnv) : false;

  const appDeployedAndReachable = !!deploymentInEnv;
  const deployFailed = latestDeploy && latestDeploy.status === DeploymentStatus.failed;
  const deployedVersionNotReachable =
    latestDeploy && !appDeployedAndReachable && latestDeploy.status === DeploymentStatus.completed;

  const deployStatusUnavailable =
    latestDeploy &&
    latestDeploy.deployedInEnv &&
    latestDeploy.build.result === DeploymentStatus.failed;

  useEffect(() => {
    if (deployPermission && latestDeploy && deployedVersionNotReachable) {
      toast.error(() => (
        <Trans i18nKey='app_deploy_messages.unable_to_list_deploys'>
          <Link inverted href='mailto:tjenesteeier@altinn.no'>
            tjenesteeier@altinn.no
          </Link>
        </Trans>
      ));
    }
  }, [deployPermission, latestDeploy, deployedVersionNotReachable]);

  useEffect(() => {
    if (!deployPermission) return;
    if (mutation.isError) {
      toast.error(() => (
        <Trans i18nKey='app_deploy_messages.technical_error_1'>
          <Link inverted href='mailto:tjenesteeier@altinn.no'>
            tjenesteeier@altinn.no
          </Link>
        </Trans>
      ));
    } else if (deployFailed) {
      toast.error(() =>
        t('app_deploy_messages.failed', {
          envName: latestDeploy.envName,
          tagName: latestDeploy.tagName,
          time: latestDeploy.build.started,
        }),
      );
    }
  }, [deployPermission, deployFailed, t, latestDeploy, mutation.isError]);

  return (
    <div className={classes.deploymentListGrid}>
      {succeededDeployHistory.length === 0 ? (
        deployStatusUnavailable ? (
          <Alert severity='warning'>
            {t('app_publish.deployment_in_env.status_missing', {
              envName: latestDeploy.envName,
              tagName: latestDeploy.tagName,
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
            {deployStatusUnavailable && (
              <Alert severity='warning'>
                {t('app_publish.deployment_in_env.status_missing', {
                  envName: latestDeploy.envName,
                  tagName: latestDeploy.tagName,
                })}
              </Alert>
            )}
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
                </LegacyTableRow>
              </LegacyTableHeader>
              <LegacyTableBody>
                {succeededDeployHistory.map((deploy: IDeployment) => (
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
        </>
      )}
    </div>
  );
};
