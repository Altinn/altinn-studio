import React, { createRef, useCallback, useEffect, useState } from 'react';
import type { IEnvironmentItem } from '../../../sharedResources/appCluster/appClusterSlice';
import { AltinnIcon, AltinnLink, AltinnSpinner } from 'app-shared/components';
import { AltinnPopoverSimple } from 'app-shared/components/molecules/AltinnPopoverSimple';
import { AppDeploymentActions } from '../../../sharedResources/appDeployment/appDeploymentSlice';
import { getAzureDevopsBuildResultUrl } from '../../../utils/urlHelper';
import { getLanguageFromKey, getParsedLanguageFromKey } from 'app-shared/utils/language';

import { useDispatch } from 'react-redux';
import type {
  ICreateAppDeploymentEnvObject,
  ICreateAppDeploymentErrors,
  IDeployment,
} from '../../../sharedResources/appDeployment/types';
import classes from './appDeploymentComponent.module.css';
import { addMinutesToTime, formatDateTime, formatTimeHHmm } from 'app-shared/pure/date-format';
import {
  Button,
  Table,
  TableRow,
  TableHeader,
  TableCell,
  TableBody,
  Select,
} from '@altinn/altinn-design-system';

interface IAppDeploymentComponentProps {
  envName: string;
  envObj: ICreateAppDeploymentEnvObject;
  deploymentList?: IEnvironmentItem;
  urlToApp?: string;
  urlToAppLinkTxt?: string;
  deployError?: ICreateAppDeploymentErrors[];
  deployHistory?: any;
  releases?: any[];
  language: any;
  deployPermission: boolean;
  orgName: string;
}

enum DeploymentStatus {
  canceled = 'canceled',
  failed = 'failed',
  inProgress = 'inProgress',
  none = 'none',
  partiallySucceeded = 'partiallySucceeded',
  succeeded = 'succeeded',
}

interface IPopoverState {
  btnConfirmText: string;
  btnMethod: () => void;
  btnCancelText: string;
  btnPrimaryId: string;
  children: any;
  anchorOrigin: any;
  transformOrigin: any;
  paperProps: any;
}

export const AppDeploymentComponent = ({
  deployError,
  deployHistory,
  deploymentList,
  deployPermission,
  envName,
  envObj,
  language,
  releases,
  urlToApp,
  urlToAppLinkTxt,
  orgName,
}: IAppDeploymentComponentProps) => {
  const dispatch = useDispatch();
  const [anchorEl, setAnchorEl] = useState(null);
  const [deployButtonDisabled, setDeployButtonDisabled] = useState(true);
  const [deployInProgress, setDeployInProgress] = useState(null);
  const [deploymentStatus, setDeploymentStatus] = useState(null);
  const [selectedImageTag, setSelectedImageTag] = useState(null);
  const [shouldDisplayDeployStatus, setShouldDisplayDeployStatus] = useState(false);
  const [succeededDeployHistory, setSucceededDeployHistory] = useState([]);

  const initialPopoverState: IPopoverState = {
    btnConfirmText: '',
    btnMethod: null,
    btnCancelText: '',
    btnPrimaryId: null,
    children: null,
    anchorOrigin: { horizontal: 'right', vertical: 'bottom' },
    transformOrigin: { horizontal: 'left', vertical: 'bottom' },
    paperProps: {},
  };

  const [popoverState, setPopoverState] = useState<IPopoverState>(initialPopoverState);
  const [deployButtonHasShownError, setDeployButtonHasShownError] = useState(null);

  const deployButtonRef = createRef<HTMLInputElement>();

  const appDeployedVersion =
    deploymentList && deploymentList.items && deploymentList.items.length > 0
      ? deploymentList.items[0].version
      : undefined;

  const doSetSelectedImageTag = (value: string) => setSelectedImageTag(value);

  const startDeploy = () => {
    setDeployInProgress(true);
    setDeployButtonHasShownError(false);
    dispatch(
      AppDeploymentActions.createAppDeployment({
        tagName: selectedImageTag,
        envObj,
      })
    );
  };

  useEffect(() => {
    setDeployButtonDisabled(selectedImageTag === null || deployInProgress === true);
  }, [selectedImageTag, deployInProgress]);

  const deployFailedPopover = useCallback(() => {
    setDeployButtonHasShownError(true);
    setAnchorEl(deployButtonRef.current);
    setPopoverState({
      ...popoverState,
      children: (
        <>
          <div>
            {getParsedLanguageFromKey('app_deploy_messages.technical_error_1', language, [])}
          </div>
          <div className={classes.typographyTekniskFeilkode}>
            {getParsedLanguageFromKey('app_deploy_messages.technical_error_code', language, [
              deployError[0].errorCode,
            ])}
          </div>
        </>
      ),
      anchorOrigin: { horizontal: 'left', vertical: 'bottom' },
      transformOrigin: { horizontal: 'left', vertical: 'top' },
      paperProps: { classes: { root: classes.paperProps } },
    });
  }, [deployButtonRef, deployError, language, popoverState]);

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

    if (deployHistory && deployHistory[0] && deployHistory[0].created) {
      setShouldDisplayDeployStatus(new Date() < addMinutesToTime(deployHistory[0].created, 60));
    }

    if (
      deployButtonHasShownError !== true &&
      deployError &&
      deployError[0] &&
      deployError[0].errorMessage !== null
    ) {
      deployFailedPopover();
    }
  }, [deployButtonHasShownError, deployError, deployFailedPopover, deployHistory]);

  const deployButtonConfirmationPopover = (event: any) => {
    setPopoverState({
      ...popoverState,
      children: (
        <>
          {appDeployedVersion
            ? getParsedLanguageFromKey('app_deploy_messages.deploy_confirmation', language, [
                selectedImageTag,
                appDeployedVersion,
              ])
            : getParsedLanguageFromKey('app_deploy_messages.deploy_confirmation_short', language, [
                selectedImageTag,
              ])}
        </>
      ),
      btnMethod: handleDeployButtonConfirmation,
      btnConfirmText: 'Ja',
      btnCancelText: 'avbryt',
      btnPrimaryId: `deploy-button-${envName.toLowerCase()}-confirm`,
      anchorOrigin: { horizontal: 'right', vertical: 'bottom' },
      transformOrigin: { horizontal: 'left', vertical: 'bottom' },
    });
    setAnchorEl(event.currentTarget);
  };

  const handleDeployButtonConfirmation = () => {
    startDeploy();
    handleClosePopover();
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
    setPopoverState(initialPopoverState);
  };

  const returnMissingPermissionsText = () => (
    <div className={classes.deployStatusGridContainer}>
      <div className={classes.deploySpinnerGridItem}>
        <AltinnIcon iconClass='fa fa-info-circle' iconColor='#000' iconSize='3.6rem' />
      </div>
      <div>
        {getParsedLanguageFromKey(
          'app_publish.missing_rights',
          language,
          [envName.toUpperCase(), orgName],
          true
        )}
      </div>
    </div>
  );

  const returnDeployDropDown = () => (
    <>
      <div>{getLanguageFromKey('app_deploy_messages.choose_version', language)}</div>
      <div className={classes.select} id={`deploy-select-${envName.toLowerCase()}`}>
        <Select options={releases} onChange={doSetSelectedImageTag} />
      </div>
      <div className={classes.deployButton} ref={deployButtonRef}>
        <Button
          disabled={deployButtonDisabled}
          onClick={deployButtonConfirmationPopover}
          id={`deploy-button-${envName.toLowerCase()}`}
        >
          {getLanguageFromKey('app_deploy_messages.btn_deploy_new_version', language)}
        </Button>
        <AltinnPopoverSimple
          open={!!anchorEl}
          anchorEl={anchorEl}
          anchorOrigin={popoverState.anchorOrigin}
          btnCancelText={popoverState.btnCancelText}
          btnClick={popoverState.btnMethod}
          btnConfirmText={popoverState.btnConfirmText}
          btnPrimaryId='deployPopover'
          handleClose={handleClosePopover}
          transformOrigin={popoverState.transformOrigin}
          paperProps={popoverState.paperProps}
        >
          {popoverState.children}
        </AltinnPopoverSimple>
      </div>
      {shouldDisplayDeployStatus && (
        <div className={classes.deployStatusGridContainer}>
          <div className={classes.deploySpinnerGridItem}>
            {deploymentStatus === DeploymentStatus.inProgress && <AltinnSpinner />}
            {deploymentStatus === DeploymentStatus.succeeded && (
              <AltinnIcon iconClass='ai ai-check-circle' iconColor='#12AA64' iconSize='3.6rem' />
            )}
            {(deploymentStatus === DeploymentStatus.partiallySucceeded ||
              deploymentStatus === DeploymentStatus.none) && (
              <AltinnIcon iconClass='ai ai-info-circle' iconColor='#008FD6' iconSize='3.6rem' />
            )}
            {(deploymentStatus === DeploymentStatus.canceled ||
              deploymentStatus === DeploymentStatus.failed) && (
              <AltinnIcon
                iconClass='ai ai-circle-exclamation'
                iconColor='#E23B53'
                iconSize='3.6rem'
              />
            )}
          </div>
          <div>
            {deploymentStatus === DeploymentStatus.inProgress &&
              getParsedLanguageFromKey('app_deploy_messages.deploy_in_progress', language, [
                deployHistory[0]?.createdBy,
                deployHistory[0]?.tagName,
                getAzureDevopsBuildResultUrl(deployHistory[0]?.build.id),
              ])}
            {deploymentStatus === DeploymentStatus.succeeded &&
              getParsedLanguageFromKey('app_deploy_messages.success', language, [
                deployHistory[0]?.tagName,
                formatTimeHHmm(deployHistory[0]?.build.finished),
                envName,
                deployHistory[0]?.createdBy,
                getAzureDevopsBuildResultUrl(deployHistory[0]?.build.id),
              ])}
            {deploymentStatus === DeploymentStatus.failed &&
              getParsedLanguageFromKey('app_deploy_messages.failed', language, [
                deployHistory[0]?.tagName,
                formatTimeHHmm(deployHistory[0]?.build.finished),
                envName,
                getAzureDevopsBuildResultUrl(deployHistory[0]?.build.id),
              ])}
            {deploymentStatus === DeploymentStatus.canceled &&
              getParsedLanguageFromKey('app_deploy_messages.canceled', language, [
                deployHistory[0]?.tagName,
                formatTimeHHmm(deployHistory[0]?.build.finished),
                envName,
                getAzureDevopsBuildResultUrl(deployHistory[0]?.build.id),
              ])}
            {deploymentStatus === DeploymentStatus.partiallySucceeded &&
              getParsedLanguageFromKey('app_deploy_messages.partiallySucceeded', language, [
                deployHistory[0]?.tagName,
                envName,
                formatTimeHHmm(deployHistory[0]?.build.finished),
                getAzureDevopsBuildResultUrl(deployHistory[0]?.build.id),
              ])}
            {deploymentStatus === DeploymentStatus.none &&
              getParsedLanguageFromKey('app_deploy_messages.none', language, [
                deployHistory[0]?.tagName,
                formatTimeHHmm(deployHistory[0]?.build.finished),
                envName,
                getAzureDevopsBuildResultUrl(deployHistory[0]?.build.id),
              ])}
          </div>
        </div>
      )}
    </>
  );

  const returnDeployUnavailable = () => (
    <div className={classes.deployUnavailableContainer}>
      <div className={classes.deploySpinnerGridItem}>
        <AltinnIcon iconClass='ai ai-circle-exclamation' iconColor='#E23B53' iconSize='3.6rem' />
      </div>
      <div>{getParsedLanguageFromKey('app_deploy_messages.unable_to_list_deploys', language)}</div>
    </div>
  );

  return (
    <div className={classes.mainContainer}>
      <div className={classes.headingContainer}>
        <div className={classes.envTitle}>
          {getParsedLanguageFromKey('app_deploy.environment', language, [envName.toUpperCase()])}
        </div>
        <div className={classes.gridItem}>
          {deploymentList &&
            deploymentList.getStatus.success === true &&
            appDeployedVersion !== undefined &&
            getParsedLanguageFromKey('app_deploy.deployed_version', language, [appDeployedVersion])}
          {deploymentList &&
            deploymentList.getStatus.success === true &&
            appDeployedVersion === undefined &&
            getParsedLanguageFromKey('app_deploy.no_app_deployed', language)}
          {deploymentList &&
            deploymentList.getStatus.success === false &&
            getParsedLanguageFromKey('app_deploy.deployed_version_unavailable', language)}
        </div>
        <div className={classes.gridItem}>
          <AltinnLink
            url={urlToApp}
            linkTxt={urlToAppLinkTxt}
            shouldShowIcon={false}
            openInNewTab={true}
          />
        </div>
      </div>
      <div className={classes.bodyContainer}>
        <div className={classes.dropdownGrid}>
          {!deployPermission && returnMissingPermissionsText()}
          {deploymentList &&
            deploymentList.getStatus.success === true &&
            deployPermission &&
            returnDeployDropDown()}
          {deploymentList &&
            deploymentList.getStatus.success === false &&
            deployPermission &&
            returnDeployUnavailable()}
        </div>
        <div className={classes.deploymentListGrid}>
          {succeededDeployHistory.length === 0 ? (
            <span id={`deploy-history-for-${envName.toLowerCase()}-unavailable`}>
              {getParsedLanguageFromKey(
                'app_deploy_table.deployed_version_history_empty',
                language,
                [envName.toUpperCase()]
              )}
            </span>
          ) : (
            <>
              <div id={`deploy-history-for-${envName.toLowerCase()}-available`}>
                {getParsedLanguageFromKey('app_deploy_table.deployed_version_history', language, [
                  envName.toUpperCase(),
                ])}
              </div>
              <div className={classes.tableWrapper} id={`deploy-history-table-${envName}`}>
                <Table
                  className={classes.table}
                  aria-label={getParsedLanguageFromKey(
                    'app_deploy_table.deploy_table_aria',
                    language,
                    [envName],
                    true
                  )}
                >
                  <TableHeader>
                    <TableRow className={classes.tableRow}>
                      <TableCell className={classes.colorBlack}>
                        {getParsedLanguageFromKey('app_deploy_table.version_col', language)}
                      </TableCell>
                      <TableCell className={classes.colorBlack}>
                        {getParsedLanguageFromKey(
                          'app_deploy_table.available_version_col',
                          language
                        )}
                      </TableCell>
                      <TableCell className={classes.colorBlack}>
                        {getParsedLanguageFromKey('app_deploy_table.deployed_by_col', language)}
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {succeededDeployHistory.map((deploy: IDeployment) => {
                      return (
                        <TableRow
                          key={`${deploy.tagName}-${deploy.created}`}
                          className={classes.tableRow}
                        >
                          <TableCell>{deploy.tagName}</TableCell>
                          <TableCell>{formatDateTime(deploy.build.finished)}</TableCell>
                          <TableCell>{deploy.createdBy}</TableCell>
                        </TableRow>
                      );
                    })}
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
