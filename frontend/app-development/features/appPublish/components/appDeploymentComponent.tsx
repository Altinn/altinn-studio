import React, { useEffect, useMemo, useState } from 'react';
import classes from './appDeploymentComponent.module.css';
import { StudioSpinner } from '@studio/components';
import { DeployDropdown } from './deploy/DeployDropdown';
import {
  Alert,
  Table,
  TableRow,
  TableHeader,
  TableCell,
  TableBody,
  Link,
} from '@digdir/design-system-react';
import { formatDateTime } from 'app-shared/pure/date-format';
import { useCreateDeploymentMutation } from '../../../hooks/mutations';
import { useTranslation, Trans } from 'react-i18next';
import { InformationSquareFillIcon } from '@navikt/aksel-icons';

import type {
  ICreateAppDeploymentErrors,
  IDeployment,
} from '../../../sharedResources/appDeployment/types';
import { toast } from 'react-toastify';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export type ImageOption = {
  value: string;
  label: string;
};

export interface AppDeploymentComponentProps {
  envName: string;
  urlToApp?: string;
  urlToAppLinkTxt?: string;
  deployError?: ICreateAppDeploymentErrors[];
  deployHistory?: IDeployment[];
  deployPermission: boolean;
  orgName: string;
  imageOptions: ImageOption[];
  showLinkToApp: boolean;
}

export enum DeploymentStatus {
  canceled = 'canceled',
  failed = 'failed',
  inProgress = 'inProgress',
  none = 'none',
  partiallySucceeded = 'partiallySucceeded',
  succeeded = 'succeeded',
}

export const AppDeploymentComponent = ({
  deployHistory,
  deployPermission,
  envName,
  imageOptions,
  urlToApp,
  urlToAppLinkTxt,
  orgName,
  showLinkToApp,
}: AppDeploymentComponentProps) => {
  const [selectedImageTag, setSelectedImageTag] = useState(null);
  const { t } = useTranslation();

  const { org, app } = useStudioUrlParams();
  const mutation = useCreateDeploymentMutation(org, app, { hideDefaultError: true });
  const startDeploy = () =>
    mutation.mutate({
      tagName: selectedImageTag,
      envName,
    });

  const succeededDeployHistory = useMemo(
    () =>
      deployHistory.filter(
        (deployment: IDeployment) =>
          deployment.build.result === DeploymentStatus.succeeded &&
          deployment.build.finished !== null,
      ),
    [deployHistory],
  );
  const latestDeploy = deployHistory ? deployHistory[0] : null;
  const deploymentInEnv = deployHistory ? deployHistory.find((d) => d.deployedInEnv) : false;
  const { deployInProgress, deploymentStatus } = useMemo(() => {
    if (latestDeploy && latestDeploy.build.finished === null && !latestDeploy.deployedInEnv) {
      return { deployInProgress: true, deploymentStatus: DeploymentStatus.inProgress };
    } else if (latestDeploy && latestDeploy.build.finished === null && latestDeploy.deployedInEnv) {
      return { deployInProgress: false, deploymentStatus: DeploymentStatus.succeeded };
    } else if (latestDeploy && latestDeploy.build.finished && latestDeploy.build.result) {
      return { deployInProgress: false, deploymentStatus: latestDeploy.build.result };
    } else {
      return { deployInProgress: false, deploymentStatus: null };
    }
  }, [latestDeploy]);

  const appDeployedAndReachable = !!deploymentInEnv;
  const deployFailed = latestDeploy && deploymentStatus === DeploymentStatus.failed;
  const deployedVersionNotReachable =
    latestDeploy && !appDeployedAndReachable && deploymentStatus === DeploymentStatus.succeeded;
  const noAppDeployed = !latestDeploy || deployInProgress;
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
    <div className={classes.mainContainer}>
      <div className={classes.headingContainer}>
        <div className={classes.envTitle}>{t('app_deploy.environment', { envName })}</div>
        <div className={classes.gridItem}>
          {appDeployedAndReachable &&
            !deployInProgress &&
            t('app_deploy.deployed_version', { appDeployedVersion: deploymentInEnv.tagName })}
          {(noAppDeployed || (deployFailed && !appDeployedAndReachable)) &&
            t('app_deploy.no_app_deployed')}
          {deployedVersionNotReachable && t('app_deploy.deployed_version_unavailable')}
        </div>
        <div className={classes.gridItem}>
          {showLinkToApp && (
            <Link href={urlToApp} target='_blank' rel='noopener noreferrer'>
              {urlToAppLinkTxt}
            </Link>
          )}
        </div>
      </div>
      <div className={classes.bodyContainer}>
        <div className={classes.dropdownGrid}>
          {!deployPermission && (
            <div className={classes.deployStatusGridContainer}>
              <div className={classes.deploySpinnerGridItem}>
                <InformationSquareFillIcon />
              </div>
              <div>{t('app_publish.missing_rights', { envName, orgName })}</div>
            </div>
          )}
          {deployPermission && imageOptions.length > 0 && !deployInProgress && (
            <DeployDropdown
              appDeployedVersion={latestDeploy ? latestDeploy.tagName : undefined}
              envName={envName}
              disabled={selectedImageTag === null || deployInProgress === true}
              deployHistoryEntry={latestDeploy}
              deploymentStatus={deploymentStatus}
              selectedImageTag={selectedImageTag}
              imageOptions={imageOptions}
              setSelectedImageTag={setSelectedImageTag}
              startDeploy={startDeploy}
            />
          )}
          {deployInProgress && (
            <StudioSpinner spinnerText={t('app_publish.deployment_in_progress') + '...'} />
          )}
        </div>
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
                <Table
                  className={classes.table}
                  aria-label={t('app_deploy_table.deploy_table_aria', { envName })}
                >
                  <TableHeader>
                    <TableRow className={classes.tableRow}>
                      <TableCell className={classes.colorBlack}>
                        {t('app_deploy_table.version_col')}
                      </TableCell>
                      <TableCell className={classes.colorBlack}>
                        {t('app_deploy_table.available_version_col')}
                      </TableCell>
                      <TableCell className={classes.colorBlack}>
                        {t('app_deploy_table.deployed_by_col')}
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {succeededDeployHistory.map((deploy: IDeployment) => (
                      <TableRow
                        key={`${deploy.tagName}-${deploy.created}`}
                        className={classes.tableRow}
                      >
                        <TableCell>{deploy.tagName}</TableCell>
                        <TableCell>{formatDateTime(deploy.build.finished)}</TableCell>
                        <TableCell>{deploy.createdBy}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
