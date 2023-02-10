import React, { useEffect, useMemo, useState } from 'react';
import type { IEnvironmentItem } from '../../../sharedResources/appCluster/appClusterSlice';
import { AltinnIcon, AltinnLink } from 'app-shared/components';
import { getParsedLanguageFromKey } from 'app-shared/utils/language';
import type {
  ICreateAppDeploymentEnvObject,
  ICreateAppDeploymentErrors,
  IDeployment,
} from '../../../sharedResources/appDeployment/types';
import classes from './appDeploymentComponent.module.css';
import { formatDateTime } from 'app-shared/pure/date-format';
import { Table, TableRow, TableHeader, TableCell, TableBody } from '@altinn/altinn-design-system';
import { ErrorMessage } from './deploy/ErrorMessage';
import { DeployDropdown } from './deploy/DeployDropdown';
import { useCreateDeployMutation } from '../hooks/mutation-hooks';
import { useParams } from 'react-router-dom';

export type ImageOption = {
  value: string;
  label: string;
};

interface IAppDeploymentComponentProps {
  envObj: ICreateAppDeploymentEnvObject;
  deploymentList?: IEnvironmentItem;
  urlToApp?: string;
  urlToAppLinkTxt?: string;
  deployError?: ICreateAppDeploymentErrors[];
  deployHistory?: any;
  deployPermission: boolean;
  orgName: string;
  language: any;
  imageOptions: ImageOption[];
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
  envObj,
  language,
  imageOptions,
  urlToApp,
  urlToAppLinkTxt,
  orgName,
}: IAppDeploymentComponentProps) => {
  const [selectedImageTag, setSelectedImageTag] = useState(null);
  const t = (key: string, params?: any) => getParsedLanguageFromKey(key, language, params || []);

  const appDeployedVersion =
    deploymentList && deploymentList.items && deploymentList.items.length > 0
      ? deploymentList.items[0].version
      : undefined;
  const { org, app } = useParams();
  const mutation = useCreateDeployMutation(org, app);
  const startDeploy = () => {
    mutation.mutate({
      tagName: selectedImageTag,
      env: envObj,
    });
  };

  const succeededDeployHistory = useMemo(
    () =>
      deployHistory.filter(
        (deployment: IDeployment) =>
          deployment.build.result === DeploymentStatus.succeeded &&
          deployment.build.finished !== null
      ),
    [deployHistory]
  );
  const latestDeploy = deployHistory ? deployHistory[0] : null;
  const { deployInProgress, deploymentStatus } = useMemo(() => {
    if (latestDeploy && latestDeploy.build.finished === null) {
      return { deployInProgress: true, deploymentStatus: DeploymentStatus.inProgress };
    } else if (latestDeploy && latestDeploy.build.finished && latestDeploy.build.result) {
      return { deployInProgress: false, deploymentStatus: latestDeploy.build.result };
    } else {
      return { deployInProgress: false, deploymentStatus: null };
    }
  }, [latestDeploy]);

  const showDeployFailedMessage = latestDeploy && latestDeploy.errorMessage !== null;

  return (
    <div className={classes.mainContainer}>
      <div className={classes.headingContainer}>
        <div className={classes.envTitle}>
          {t('app_deploy.environment', [envObj.name.toUpperCase()])}
        </div>
        <div className={classes.gridItem}>
          {deploymentList &&
            deploymentList.getStatus.success === true &&
            appDeployedVersion !== undefined &&
            t('app_deploy.deployed_version', [appDeployedVersion])}
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
                {getParsedLanguageFromKey(
                  'app_publish.missing_rights',
                  language,
                  [envObj.name.toUpperCase(), orgName],
                  true
                )}
              </div>
            </div>
          )}
          {imageOptions.length && deployPermission && (
            <DeployDropdown
              appDeployedVersion={appDeployedVersion}
              language={language}
              envName={envObj.name}
              disabled={selectedImageTag === null || deployInProgress === true}
              deployHistoryEntry={latestDeploy}
              deploymentStatus={deploymentStatus}
              selectedImageTag={selectedImageTag}
              imageOptions={imageOptions}
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
              message={t('app_deploy_messages.technical_error_1', [])}
              code={t('app_deploy_messages.technical_error_code', [deployError[0].errorCode])}
            />
          )}
        </div>
        <div className={classes.deploymentListGrid}>
          {succeededDeployHistory.length === 0 ? (
            <span id={`deploy-history-for-${envObj.name.toLowerCase()}-unavailable`}>
              {t('app_deploy_table.deployed_version_history_empty', [envObj.name.toUpperCase()])}
            </span>
          ) : (
            <>
              <div id={`deploy-history-for-${envObj.name.toLowerCase()}-available`}>
                {t('app_deploy_table.deployed_version_history', [envObj.name.toUpperCase()])}
              </div>
              <div className={classes.tableWrapper} id={`deploy-history-table-${envObj.name}`}>
                <Table
                  className={classes.table}
                  aria-label={getParsedLanguageFromKey(
                    'app_deploy_table.deploy_table_aria',
                    language,
                    [envObj.name],
                    true
                  )}
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
