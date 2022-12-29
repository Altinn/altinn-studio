import React, { useCallback } from 'react';
import AltinnPopoverSimple from 'app-shared/components/molecules/AltinnPopoverSimple';
import Select from 'react-select';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import classNames from 'classnames';
import moment from 'moment';
import type { IEnvironmentItem } from '../../../sharedResources/appCluster/appClusterSlice';
import type { Theme } from '@mui/material';
import { AltinnButton, AltinnIcon, AltinnLink, AltinnSpinner } from 'app-shared/components';
import { AppDeploymentActions } from '../../../sharedResources/appDeployment/appDeploymentSlice';
import { createStyles, makeStyles } from '@mui/styles';
import { getAzureDevopsBuildResultUrl } from '../../../utils/urlHelper';
import { getLanguageFromKey, getParsedLanguageFromKey } from 'app-shared/utils/language';
import { getValueByPath } from 'app-shared/utils/getValueByPath';
import { useDispatch } from 'react-redux';
import type {
  ICreateAppDeploymentEnvObject,
  ICreateAppDeploymentErrors,
  IDeployment,
} from '../../../sharedResources/appDeployment/types';
import {
  createTheme,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
} from '@mui/material';

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

const theme = createTheme(altinnTheme);

const useStyles = makeStyles(() =>
  createStyles({
    mainContainer: {
      height: 'fit-content',
    },
    headingContainer: {
      borderTop: '2px solid #000000',
      borderBottom: '2px solid #C9C9C9',
      marginTop: '2rem',
      marginBottom: '3.6rem',
      paddingLeft: '5rem',
      paddingRight: '5rem',
      paddingTop: '2rem',
      paddingBottom: '2rem',
      width: '100%',
    },
    dropdownGrid: {
      paddingBottom: '5rem',
      paddingRight: '6rem',
      paddingLeft: '5rem',
    },
    select: {
      maxWidth: '34rem',
      zIndex: 900,
    },
    gridItem: {
      paddingRight: '2rem',
    },
    gridBorder: {
      border: '1px solid black',
    },
    gridEnvTitle: {
      maxWidth: '22.5rem',
      paddingRight: '0.5rem',
    },
    envTitle: {
      fontSize: 18,
      fontWeight: 500,
    },
    table: {
      backgroundColor: '#ffffff',
      [theme.breakpoints.up('xs')]: {
        minWidth: '30rem',
      },
      [theme.breakpoints.up('lg')]: {
        minWidth: '56rem',
      },
    },
    colorBlack: {
      color: '#000',
    },
    tableRow: {
      height: '2.6rem',
    },
    tableWrapper: {
      maxHeight: 350,
      overflow: 'auto',
    },
    deployButton: {
      marginTop: '2.6rem',
    },
    deployStatusGridContainer: {
      marginTop: '2.6rem',
    },
    deploySpinnerGridItem: {
      minWidth: '4.4rem',
    },
    deploymentListGrid: {
      paddingLeft: '4.8rem',
    },
    deployUnavailableContainer: {
      backgroundColor: theme.altinnPalette.primary.redLight,
      padding: '1.2rem',
    },
    paperProps: {
      backgroundColor: '#F9CAD3',
    },
    typographyTekniskFeilkode: {
      paddingTop: '1.2rem',
    },
  })
);

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

const AppDeploymentComponent = ({
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
  const classes = useStyles();
  const dispatch = useDispatch();
  const hiddenMdDown = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const breakpointMdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));

  const [anchorEl, setAnchorEl] = React.useState(null);
  const [deployButtonDisabled, setDeployButtonDisabled] = React.useState(true);
  const [deployInProgress, setDeployInProgress] = React.useState(null);
  const [deploymentStatus, setDeploymentStatus] = React.useState(null);
  const [selectedImageTag, setSelectedImageTag] = React.useState(null);
  const [shouldDisplayDeployStatus, setShouldDisplayDeployStatus] = React.useState(false);
  const [succeededDeployHistory, setSucceededDeployHistory] = React.useState([]);

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

  const [popoverState, setPopoverState] = React.useState<IPopoverState>(initialPopoverState);
  const [deployButtonHasShownError, setDeployButtonHasShownError] = React.useState(null);

  const deployButtonRef = React.createRef<HTMLInputElement>();

  const appDeployedVersion =
    deploymentList && deploymentList.items && deploymentList.items.length > 0
      ? deploymentList.items[0].version
      : undefined;

  const doSetSelectedImageTag = (event: any) => {
    if (getValueByPath(event, 'value', null) !== null) {
      setSelectedImageTag(event.value);
    } else {
      setSelectedImageTag(null);
    }
  };

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

  React.useEffect(() => {
    if (selectedImageTag === null || deployInProgress === true) {
      setDeployButtonDisabled(true);
    } else {
      setDeployButtonDisabled(false);
    }
  }, [selectedImageTag, deployInProgress]);

  const deployFailedPopover = useCallback(() => {
    setDeployButtonHasShownError(true);
    setAnchorEl(deployButtonRef.current);
    setPopoverState({
      ...popoverState,
      children: (
        <>
          <Typography>
            {getParsedLanguageFromKey('app_deploy_messages.technical_error_1', language, [])}
          </Typography>
          <div className={classes.typographyTekniskFeilkode}>
            <Typography variant='caption'>
              {getParsedLanguageFromKey('app_deploy_messages.technical_error_code', language, [
                deployError[0].errorCode,
              ])}
            </Typography>
          </div>
        </>
      ),
      anchorOrigin: { horizontal: 'left', vertical: 'bottom' },
      transformOrigin: { horizontal: 'left', vertical: 'top' },
      paperProps: { classes: { root: classes.paperProps } },
    });
  }, [
    classes.paperProps,
    classes.typographyTekniskFeilkode,
    deployButtonRef,
    deployError,
    language,
    popoverState,
  ]);
  React.useEffect(() => {
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

    setSucceededDeployHistory(
      deployHistory.filter(
        (deployment: IDeployment) =>
          deployment.build.result === DeploymentStatus.succeeded &&
          deployment.build.finished !== null
      )
    );

    if (deployHistory && deployHistory[0] && deployHistory[0].created) {
      const now = moment();
      const deployCreatedPlusOneHour = moment(new Date(deployHistory[0].created)).add(60, 'm');
      now < deployCreatedPlusOneHour
        ? setShouldDisplayDeployStatus(true)
        : setShouldDisplayDeployStatus(false);
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
        <Typography>
          {appDeployedVersion
            ? getParsedLanguageFromKey('app_deploy_messages.deploy_confirmation', language, [
                selectedImageTag,
                appDeployedVersion,
              ])
            : getParsedLanguageFromKey('app_deploy_messages.deploy_confirmation_short', language, [
                selectedImageTag,
              ])}
        </Typography>
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

  const selectNoOptionsMessage = () => getLanguageFromKey('app_publish.no_versions', language);

  const returnMissingPermissionsText = () => (
    <Grid container={true} className={classes.deployStatusGridContainer} alignItems='center'>
      <Grid item={true} className={classes.deploySpinnerGridItem} xs={1}>
        <AltinnIcon
          iconClass='fa fa-info-circle'
          iconColor={theme.altinnPalette.primary.black}
          iconSize='3.6rem'
        />
      </Grid>
      <Grid item xs={10}>
        <Typography>
          {getParsedLanguageFromKey(
            'app_publish.missing_rights',
            language,
            [envName.toUpperCase(), orgName],
            true
          )}
        </Typography>
      </Grid>
    </Grid>
  );

  const returnDeployDropDown = () => (
    <>
      <Typography>{getLanguageFromKey('app_deploy_messages.choose_version', language)}</Typography>
      <div className={classes.select} id={`deploy-select-${envName.toLowerCase()}`}>
        <Select
          className='basic-single'
          classNamePrefix='select'
          isClearable={true}
          isSearchable={true}
          name='color'
          options={releases}
          onChange={doSetSelectedImageTag}
          noOptionsMessage={selectNoOptionsMessage}
          placeholder=''
        />
      </div>
      <div className={classes.deployButton} ref={deployButtonRef}>
        <AltinnButton
          btnText={getLanguageFromKey('app_deploy_messages.btn_deploy_new_version', language)}
          disabled={deployButtonDisabled}
          onClickFunction={deployButtonConfirmationPopover}
          id={`deploy-button-${envName.toLowerCase()}`}
        />
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
        <Grid container={true} className={classes.deployStatusGridContainer} alignItems='center'>
          <Grid item={true} className={classes.deploySpinnerGridItem} xs={1}>
            {deploymentStatus === DeploymentStatus.inProgress && <AltinnSpinner />}
            {deploymentStatus === DeploymentStatus.succeeded && (
              <AltinnIcon
                iconClass='ai ai-check-circle'
                iconColor={theme.altinnPalette.primary.green}
                iconSize='3.6rem'
              />
            )}
            {(deploymentStatus === DeploymentStatus.partiallySucceeded ||
              deploymentStatus === DeploymentStatus.none) && (
              <AltinnIcon
                iconClass='ai ai-info-circle'
                iconColor={theme.altinnPalette.primary.blueMedium}
                iconSize='3.6rem'
              />
            )}
            {(deploymentStatus === DeploymentStatus.canceled ||
              deploymentStatus === DeploymentStatus.failed) && (
              <AltinnIcon
                iconClass='ai ai-circle-exclamation'
                iconColor={theme.altinnPalette.primary.red}
                iconSize='3.6rem'
              />
            )}
          </Grid>
          <Grid item={true} xs={true}>
            {deploymentStatus === DeploymentStatus.inProgress && (
              <Typography>
                {getParsedLanguageFromKey('app_deploy_messages.deploy_in_progress', language, [
                  deployHistory[0].createdBy,
                  deployHistory[0].tagName,
                  getAzureDevopsBuildResultUrl(deployHistory[0].build.id),
                ])}
              </Typography>
            )}
            {deploymentStatus === DeploymentStatus.succeeded && (
              <Typography>
                {getParsedLanguageFromKey('app_deploy_messages.success', language, [
                  deployHistory[0].tagName,
                  moment(new Date(deployHistory[0].build.finished)).format('HH:mm'),
                  envName,
                  deployHistory[0].createdBy,
                  getAzureDevopsBuildResultUrl(deployHistory[0].build.id),
                ])}
              </Typography>
            )}
            {deploymentStatus === DeploymentStatus.failed && (
              <Typography>
                {getParsedLanguageFromKey('app_deploy_messages.failed', language, [
                  deployHistory[0].tagName,
                  moment(new Date(deployHistory[0].build.finished)).format('HH:mm'),
                  envName,
                  getAzureDevopsBuildResultUrl(deployHistory[0].build.id),
                ])}
              </Typography>
            )}
            {deploymentStatus === DeploymentStatus.canceled && (
              <Typography>
                {getParsedLanguageFromKey('app_deploy_messages.canceled', language, [
                  deployHistory[0].tagName,
                  moment(new Date(deployHistory[0].build.finished)).format('HH:mm'),
                  envName,
                  getAzureDevopsBuildResultUrl(deployHistory[0].build.id),
                ])}
              </Typography>
            )}
            {deploymentStatus === DeploymentStatus.partiallySucceeded && (
              <Typography>
                {getParsedLanguageFromKey('app_deploy_messages.partiallySucceeded', language, [
                  deployHistory[0].tagName,
                  envName,
                  moment(new Date(deployHistory[0].build.finished)).format('HH:mm'),
                  getAzureDevopsBuildResultUrl(deployHistory[0].build.id),
                ])}
              </Typography>
            )}
            {deploymentStatus === DeploymentStatus.none && (
              <Typography>
                {getParsedLanguageFromKey('app_deploy_messages.none', language, [
                  deployHistory[0].tagName,
                  moment(new Date(deployHistory[0].build.finished)).format('HH:mm'),
                  envName,
                  getAzureDevopsBuildResultUrl(deployHistory[0].build.id),
                ])}
              </Typography>
            )}
          </Grid>
        </Grid>
      )}
    </>
  );

  const returnDeployUnavailable = () => (
    <>
      <Grid container={true} className={classes.deployUnavailableContainer} alignItems='flex-start'>
        <Grid item={true} className={classes.deploySpinnerGridItem} xs={1}>
          <AltinnIcon
            iconClass='ai ai-circle-exclamation'
            iconColor={theme.altinnPalette.primary.red}
            iconSize='3.6rem'
          />
        </Grid>
        <Grid item={true} xs={true}>
          {getParsedLanguageFromKey('app_deploy_messages.unable_to_list_deploys', language)}
        </Grid>
      </Grid>
    </>
  );

  return (
    <>
      <Grid container={true} className={classes.mainContainer}>
        <Grid container={true} item={true} className={classes.headingContainer}>
          <Grid item={true} className={classes.gridEnvTitle} xs={3}>
            <Typography className={classes.envTitle}>
              {getParsedLanguageFromKey('app_deploy.environment', language, [
                envName.toUpperCase(),
              ])}
            </Typography>
          </Grid>
          <Grid item={true} className={classes.gridItem} xs={3}>
            {deploymentList &&
              deploymentList.getStatus.success === true &&
              appDeployedVersion !== undefined && (
                <>
                  {getParsedLanguageFromKey('app_deploy.deployed_version', language, [
                    appDeployedVersion,
                  ])}
                </>
              )}
            {deploymentList &&
              deploymentList.getStatus.success === true &&
              appDeployedVersion === undefined && (
                <>{getParsedLanguageFromKey('app_deploy.no_app_deployed', language)}</>
              )}
            {deploymentList && deploymentList.getStatus.success === false && (
              <>{getParsedLanguageFromKey('app_deploy.deployed_version_unavailable', language)}</>
            )}
          </Grid>
          <Grid item={true} className={classes.gridItem} xs={6}>
            <AltinnLink
              classes={{}}
              url={urlToApp}
              linkTxt={urlToAppLinkTxt}
              shouldShowIcon={false}
              openInNewTab={true}
            />
          </Grid>
        </Grid>

        <Grid item={true} xs={12} sm={12} md={5} className={classNames(classes.dropdownGrid)}>
          {!deployPermission && returnMissingPermissionsText()}
          {deploymentList &&
            deploymentList.getStatus.success === true &&
            deployPermission &&
            returnDeployDropDown()}
          {deploymentList &&
            deploymentList.getStatus.success === false &&
            deployPermission &&
            returnDeployUnavailable()}
        </Grid>

        <Grid item={true} className={classes.deploymentListGrid}>
          {succeededDeployHistory.length === 0 ? (
            <Typography id={`deploy-history-for-${envName.toLowerCase()}-unavailable`}>
              {getParsedLanguageFromKey(
                'app_deploy_table.deployed_version_history_empty',
                language,
                [envName.toUpperCase()]
              )}
            </Typography>
          ) : (
            <>
              <Typography id={`deploy-history-for-${envName.toLowerCase()}-available`}>
                {getParsedLanguageFromKey('app_deploy_table.deployed_version_history', language, [
                  envName.toUpperCase(),
                ])}
              </Typography>
              <div className={classes.tableWrapper} id={`deploy-history-table-${envName}`}>
                <Table
                  stickyHeader={!!breakpointMdUp}
                  className={classes.table}
                  size='small'
                  aria-label={getParsedLanguageFromKey(
                    'app_deploy_table.deploy_table_aria',
                    language,
                    [envName],
                    true
                  )}
                >
                  <TableHead>
                    <TableRow className={classes.tableRow}>
                      <TableCell className={classes.colorBlack}>
                        <Typography>
                          {getParsedLanguageFromKey('app_deploy_table.version_col', language)}
                        </Typography>
                      </TableCell>
                      <TableCell className={classes.colorBlack}>
                        <Typography>
                          {getParsedLanguageFromKey(
                            'app_deploy_table.available_version_col',
                            language
                          )}
                        </Typography>
                      </TableCell>
                      {hiddenMdDown ? null : (
                        <TableCell className={classes.colorBlack}>
                          <Typography>
                            {getParsedLanguageFromKey('app_deploy_table.deployed_by_col', language)}
                          </Typography>
                        </TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {succeededDeployHistory.map((deploy: IDeployment) => {
                      return (
                        <TableRow key={deploy.tagName} className={classes.tableRow}>
                          <TableCell component='th' scope='row'>
                            <Typography>{deploy.tagName}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography>
                              {moment(new Date(deploy.build.finished)).format('DD.MM.YY HH:mm')}
                            </Typography>
                          </TableCell>
                          {hiddenMdDown ? null : (
                            <TableCell>
                              <Typography>{deploy.createdBy}</Typography>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </Grid>
      </Grid>
    </>
  );
};

export default AppDeploymentComponent;
