import React, { useEffect, useState } from 'react';
import type { IEnvironmentItem } from '../../../sharedResources/appCluster/appClusterSlice';
import { AltinnIcon, AltinnLink } from 'app-shared/components';
import { AppDeploymentActions } from '../../../sharedResources/appDeployment/appDeploymentSlice';
import { useDispatch } from 'react-redux';
import type {
  ICreateAppDeploymentErrors,
  IDeployment,
} from '../../../sharedResources/appDeployment/types';
import classes from './appDeploymentComponent.module.css';
import { formatDateTime } from 'app-shared/pure/date-format';
import { Table, TableRow, TableHeader, TableCell, TableBody } from '@altinn/altinn-design-system';
import { ErrorMessage } from './deploy/ErrorMessage';
import { DeployDropdown } from './deploy/DeployDropdown';
import { useTranslation } from 'react-i18next';

interface IAppDeploymentComponentProps {
  envName: string;
  deploymentList?: IEnvironmentItem;
  urlToApp?: string;
  urlToAppLinkTxt?: string;
  deployError?: ICreateAppDeploymentErrors[];
  deployHistory?: any;
  deployPermission: boolean;
  orgName: string;
  releases: any;
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
  deployError,
  deployHistory,
  deploymentList,
  deployPermission,
  envName,
  releases,
  urlToApp,
  urlToAppLinkTxt,
  orgName,
}: IAppDeploymentComponentProps) => {
  const dispatch = useDispatch();
  const [deployInProgress, setDeployInProgress] = useState(null);
  const [deploymentStatus, setDeploymentStatus] = useState(null);
  const [selectedImageTag, setSelectedImageTag] = useState(null);
  const [succeededDeployHistory, setSucceededDeployHistory] = useState([]);
  const { t } = useTranslation();

  const [deployButtonHasShownError, setDeployButtonHasShownError] = useState(null);

  const appDeployedVersion =
    deploymentList && deploymentList.items && deploymentList.items.length > 0
      ? deploymentList.items[0].version
      : undefined;

  const startDeploy = () => {
    setDeployInProgress(true);
    setDeployButtonHasShownError(false);
    dispatch(
      AppDeploymentActions.createAppDeployment({
        tagName: selectedImageTag,
        envName,
      })
    );
  };

  useEffect(() => {
    setSucceededDeployHistory(
      deployHistory.filter(
        (deployment: IDeployment) =>
          deployment.build.result === DeploymentStatus.succeeded &&
          deployment.build.finished !== null
      )
    );
  }, [deployHistory]);

  useEffect(() => {
    if (deployHistory && deployHistory[0] && deployHistory[0].build.finished === null) {
      setDeployInProgress(true);
      setDeploymentStatus(DeploymentStatus.inProgress);
    } else if (
      deployHistory &&
      deployHistory[0] &&
      deployHistory[0].build.finished &&
      deployHistory[0].build.result
    ) {
      setDeployInProgress(false);
      setDeploymentStatus(deployHistory[0].build.result);
    } else {
      setDeployInProgress(false);
      setDeploymentStatus(null);
    }
  }, [deployButtonHasShownError, deployError, deployHistory]);

  const showDeployFailedMessage =
    deployButtonHasShownError !== true &&
    deployError &&
    deployError[0] &&
    deployError[0].errorMessage !== null;

  return (
    <div className={classes.mainContainer}>
      <div className={classes.headingContainer}>
        <div className={classes.envTitle}>
          {t('app_deploy.environment', { envName })}
        </div>
        <div className={classes.gridItem}>
          {deploymentList &&
            deploymentList.getStatus.success === true &&
            appDeployedVersion !== undefined &&
            t('app_deploy.deployed_version', { appDeployedVersion })}
          {deploymentList &&
            deploymentList.getStatus.success === true &&
            appDeployedVersion === undefined &&
            t('app_deploy.no_app_deployed')}
          {deploymentList &&
            deploymentList.getStatus.success === false &&
            t('app_deploy.deployed_version_unavailable')}
        </div>
        <div className={classes.gridItem}>
          {appDeployedVersion && (
            <AltinnLink
              url={urlToApp}
              linkTxt={urlToAppLinkTxt}
              shouldShowIcon={false}
              openInNewTab={true}
            />
          )}
        </div>
      </div>
      <div className={classes.bodyContainer}>
        <div className={classes.dropdownGrid}>
          {!deployPermission && (
            <div className={classes.deployStatusGridContainer}>
              <div className={classes.deploySpinnerGridItem}>
                <AltinnIcon iconClass='fa fa-info-circle' iconColor='#000' iconSize='3.6rem' />
              </div>
              <div>
                {t('app_publish.missing_rights', { envName, orgName })}
              </div>
            </div>
          )}
          {deploymentList && deploymentList.getStatus.success === true && deployPermission && (
            <DeployDropdown
              appDeployedVersion={appDeployedVersion}
              envName={envName}
              disabled={selectedImageTag === null || deployInProgress === true}
              deployHistoryEntry={deployHistory[0]}
              deploymentStatus={deploymentStatus}
              selectedImageTag={selectedImageTag}
              releases={releases}
              setSelectedImageTag={setSelectedImageTag}
              startDeploy={startDeploy}
            />
          )}
          {deploymentList && deploymentList.getStatus.success === false && deployPermission && (
            <div className={classes.deployUnavailableContainer}>
              <div className={classes.deploySpinnerGridItem}>
                <AltinnIcon
                  iconClass='ai ai-circle-exclamation'
                  iconColor='#E23B53'
                  iconSize='3.6rem'
                />
              </div>
              <div>{t('app_deploy_messages.unable_to_list_deploys')}</div>
            </div>
          )}
          {showDeployFailedMessage && (
            <ErrorMessage
              message={t('app_deploy_messages.technical_error_1')}
              code={t('app_deploy_messages.technical_error_code', { errorCode: deployError[0].errorCode })}
            />
          )}
        </div>
        <div className={classes.deploymentListGrid}>
          {succeededDeployHistory.length === 0 ? (
            <span id={`deploy-history-for-${envName.toLowerCase()}-unavailable`}>
              {t('app_deploy_table.deployed_version_history_empty', { envName })}
            </span>
          ) : (
            <>
              <div id={`deploy-history-for-${envName.toLowerCase()}-available`}>
                {t('app_deploy_table.deployed_version_history', { envName })}
              </div>
              <div className={classes.tableWrapper} id={`deploy-history-table-${envName}`}>
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
