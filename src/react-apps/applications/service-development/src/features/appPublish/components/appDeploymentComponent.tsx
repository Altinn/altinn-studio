// import { useEffect, useState } from 'react';
import { createMuiTheme, createStyles, Grid, Hidden, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import classNames from 'classnames';
import * as moment from 'moment';
import * as React from 'react';
import Select from 'react-select';
import { AltinnButton } from '../../../../../shared/src/components/AltinnButton';
import { AltinnIcon } from '../../../../../shared/src/components/AltinnIcon';
import { AltinnLink } from '../../../../../shared/src/components/AltinnLink';
import AltinnSpinner from '../../../../../shared/src/components/AltinnSpinner';
import AltinnPopoverSimple from '../../../../../shared/src/components/molecules/AltinnPopoverSimple';
import altinnTheme from '../../../../../shared/src/theme/altinnStudioTheme';
import { getValueByPath } from '../../../../../shared/src/utils/getValueByPath';
import { IEnvironmentItem } from '../../../sharedResources/appCluster/appClusterReducer';
import AppDeploymentActions from '../../../sharedResources/appDeployment/appDeploymentDispatcher';
import { ICreateAppDeploymentErrors } from '../../../sharedResources/appDeployment/appDeploymentReducer';
import { ICreateAppDeploymentEnvObject } from '../../../sharedResources/appDeployment/create/createAppDeploymentActions';
import { getAzureDevopsBuildResultUrl } from './../../../utils/urlHelper';

export interface IReceiptContainerProps {
  envName: string;
  envObj: ICreateAppDeploymentEnvObject;
  deploymentList?: IEnvironmentItem;
  urlToApp?: string;
  urlToAppLinkTxt?: string;
  deployError?: ICreateAppDeploymentErrors[];
  deployHistory?: any;
  releases?: any[];
}

const theme = createMuiTheme(altinnTheme);

const useStyles = makeStyles(() =>
  createStyles({
    mainContainer: {

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
      maxWidth: '40rem',
    },
    gridItem: {
      paddingRight: '2rem',
      // border: '1px solid black',
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
        minWidth: '40rem',
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
      marginRight: '1.2rem',
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
  }),
);

const AppDeploymentComponent = (props: IReceiptContainerProps) => {
  const classes = useStyles(props);

  const [selectedImageTag, setSelectedImageTag] = React.useState(null);
  const [deployInProgress, setDeployInProgress] = React.useState(null);
  const [deployButtonDisabled, setDeployButtonDisabled] = React.useState(true);
  const [succeededDeployHistory, setSucceededDeployHistory] = React.useState([]);
  const [shouldDisplayDeployStatus, setShouldDisplayDeployStatus] = React.useState(false);
  const [deploymentStatus, setDeploymentStatus] = React.useState(null);

  const [anchorEl, setAnchorEl] = React.useState(null);

  interface IPopoverState  {
    btnConfirmText: string;
    btnMethod: () => void;
    btnCancelText: string;
    children: any;
    anchorOrigin: any;
    transformOrigin: any;
    paperProps: any;
  }

  const initialPopoverState: IPopoverState = {
    btnConfirmText: '',
    btnMethod: null,
    btnCancelText: '',
    children: null,
    anchorOrigin: { horizontal: 'right', vertical: 'bottom' },
    transformOrigin: { horizontal: 'left', vertical: 'bottom' },
    paperProps: {},
  };

  const [popoverState, setPopoverState] = React.useState<IPopoverState>(initialPopoverState);
  const [deployButtonHasShownError, setDeployButtonHasShownError] = React.useState(null);

  const deployButtonRef = React.createRef<HTMLInputElement>();

  const { deployError, deployHistory, deploymentList, envName, envObj, releases, urlToApp, urlToAppLinkTxt } = props;

  const appDeployedVersion = deploymentList && deploymentList.items && deploymentList.items.length > 0 ?
    deploymentList.items[0].spec.template.spec.containers[0].image.split(':')[1] : undefined;

  // TODO: SHared enum with releases.
  enum deploymentStatusEnum {
    canceled = 'canceled',
    failed = 'failed',
    inProgress = 'inProgress',
    none = 'none',
    partiallySucceeded = 'partiallySucceeded',
    succeeded = 'succeeded',
  }

  const doSetSelectedImageTag = (event: any) => {
    if (getValueByPath(event, 'value', null) !== null) {
      setSelectedImageTag(event.value);
    } else {
      setSelectedImageTag(null);
    }
  };

  const startDeploy = () => {
    console.log('startDeploy', selectedImageTag, envName);
    setDeployInProgress(true);
    setDeployButtonHasShownError(false);
    AppDeploymentActions.createAppDeployment(selectedImageTag, envObj);
  };

  React.useEffect(() => {
    if (selectedImageTag === null || deployInProgress === true) {
      setDeployButtonDisabled(true);
    } else {
      setDeployButtonDisabled(false);
    }
  }, [selectedImageTag, deployInProgress]);

  React.useEffect(() => {
    if (deployHistory && deployHistory[0] && deployHistory[0].build.finished === null) {
      setDeployInProgress(true);
      setDeploymentStatus(deploymentStatusEnum.inProgress);
    } else if (deployHistory && deployHistory[0] && deployHistory[0].build.finished && deployHistory[0].build.result) {
      setDeployInProgress(false);
      setDeploymentStatus(deployHistory[0].build.result);
    } else {
      setDeployInProgress(false);
      setDeploymentStatus(null);
    }

    setSucceededDeployHistory(deployHistory.filter((deployment: any) =>
      deployment.build.result === deploymentStatusEnum.succeeded && deployment.build.finished !== null));

    if (deployHistory && deployHistory[0] && deployHistory[0].created) {
      const now = moment();
      const deployCreatedPlusOneHour = moment(new Date(deployHistory[0].created)).add(60, 'm');
      now < deployCreatedPlusOneHour ? setShouldDisplayDeployStatus(true) : setShouldDisplayDeployStatus(false);
    }

    if (deployButtonHasShownError !== true && deployError && deployError[0] && deployError[0].error !== null) {
      deployFailedPopover('Create deployment failed');
    }

  }, [deployHistory]);

  const returnBuildLogLink = (linkTxt: string, buildId: string|number) => (
    <AltinnLink
      linkTxt={linkTxt}
      url={getAzureDevopsBuildResultUrl(buildId)}
      shouldShowIcon={false}
      classes={{}}
    />
  );

  const deployButtonConfirmationPopover = (event: any) => {
    setPopoverState({
      ...popoverState,
      children: (
        <Typography>
          {`Er du sikker på at du vil deploye ${selectedImageTag} til miljøet.
            Dette vil overskrive eksisterende versjon ${appDeployedVersion}`}
        </Typography>
        ),
      btnMethod: handleDeployButtonConfirmation,
      btnConfirmText: 'Ja',
      btnCancelText: 'avbryt',
      anchorOrigin: { horizontal: 'right', vertical: 'bottom' },
      transformOrigin: { horizontal: 'left', vertical: 'bottom' },
    });
    setAnchorEl(event.currentTarget);
  };

  const deployFailedPopover = (children: string) => {
    setDeployButtonHasShownError(true);
    setAnchorEl(deployButtonRef.current);
    setPopoverState({
      ...popoverState,
      children: (
        <Typography>Huff da, vi opplever en teknisk feil og får derfor ikke startet deploy.
        Forsøk igjen senere. Dersom problemet vedvarer, kontakt Altinn servicedesk</Typography>
      ),
      btnCancelText: 'lukk',
      anchorOrigin: { horizontal: 'left', vertical: 'bottom' },
      transformOrigin: { horizontal: 'left', vertical: 'top' },
      paperProps: { classes: { root: classes.paperProps } },
    });
  };

  const handleDeployButtonConfirmation = () => {
    startDeploy();
    handleClosePopover();
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
    setPopoverState(initialPopoverState);
  };

  const returnDeployDropDown = () => (
    <>
      <Typography>
        Velg ønsket versjon for deploy
      </Typography>
      <div className={classes.select}>
        <Select
          className='basic-single'
          classNamePrefix='select'
          isClearable={true}
          isSearchable={true}
          name='color'
          options={releases}
          onChange={doSetSelectedImageTag}
        />
      </div>
      <div className={classes.deployButton} ref={deployButtonRef}>
        <AltinnButton
          btnText='Deploy ny versjon'
          disabled={deployButtonDisabled}
          onClickFunction={deployButtonConfirmationPopover}
        />
        <AltinnPopoverSimple
          classes={{}}
          anchorEl={anchorEl}
          anchorOrigin={popoverState.anchorOrigin}
          btnCancelText={popoverState.btnCancelText}
          btnClick={popoverState.btnMethod}
          btnConfirmText={popoverState.btnConfirmText}
          btnPrimaryId='deployPopover'
          handleClose={handleClosePopover}
          transformOrigin={popoverState.transformOrigin}
          children={popoverState.children}
          paperProps={popoverState.paperProps}
        />
      </div>
      {shouldDisplayDeployStatus &&
        <Grid container={true} className={classes.deployStatusGridContainer} alignItems='center'>
          <Grid item={true} className={classes.deploySpinnerGridItem} xs={1}>
            {deploymentStatus === deploymentStatusEnum.inProgress &&
              <AltinnSpinner/>
            }
            {deploymentStatus === deploymentStatusEnum.succeeded &&
              <AltinnIcon
                iconClass='ai ai-check-circle'
                iconColor={theme.altinnPalette.primary.green}
                iconSize='3.6rem'
              />
            }
            {(deploymentStatus === deploymentStatusEnum.partiallySucceeded ||
              deploymentStatus === deploymentStatusEnum.none) &&
              <AltinnIcon
                iconClass='ai ai-info-circle'
                iconColor={theme.altinnPalette.primary.blueMedium}
                iconSize='3.6rem'
              />
            }
            {(deploymentStatus === deploymentStatusEnum.canceled ||
              deploymentStatus === deploymentStatusEnum.failed) &&
              <AltinnIcon
                iconClass='ai ai-circle-exclamation'
                iconColor={theme.altinnPalette.primary.red}
                iconSize='3.6rem'
              />
            }
          </Grid>
          <Grid item={true} xs={true}>
            {deploymentStatus === deploymentStatusEnum.inProgress &&
              <Typography>
                {deployHistory[0].createdBy} deployer versjon {deployHistory[0].tagName}
              </Typography>
            }
            {deploymentStatus === deploymentStatusEnum.succeeded &&
              <Typography>
                Versjon {deployHistory[0].tagName} er deployet kl.
                {moment(new Date(deployHistory[0].build.finished)).format('HH:mm')} til {envName}
                av {deployHistory[0].createdBy}.
                For mer informasjon se {returnBuildLogLink('byggloggen', deployHistory[0].build.id)}
              </Typography>
            }
            {deploymentStatus === deploymentStatusEnum.failed &&
              <Typography>
                Noe gikk galt under deploy av versjon {deployHistory[0].tagName} kl.
                {moment(new Date(deployHistory[0].build.finished)).format('HH:mm')} til {envName}-miljøet.
                For mer informasjon se {returnBuildLogLink('byggloggen', deployHistory[0].build.id)}
              </Typography>
            }
            {deploymentStatus === deploymentStatusEnum.canceled &&
              <Typography>
                Vi opplever en feil og har derfor stoppet din deploy av versjon {deployHistory[0].tagName} kl.
                {moment(new Date(deployHistory[0].build.finished)).format('HH:mm')} til {envName}-miljøet.
                For mer informasjon se {returnBuildLogLink('byggloggen', deployHistory[0].build.id)}
              </Typography>
            }
            {deploymentStatus === deploymentStatusEnum.partiallySucceeded &&
              <Typography>
                Versjon {deployHistory[0].tagName} er deployet til {envName}-miljøet kl.
                {moment(new Date(deployHistory[0].build.finished)).format('HH:mm')}, men inneholderfeil / mangler.
                For mer informasjon se {returnBuildLogLink('byggloggen', deployHistory[0].build.id)}
              </Typography>
            }
            {deploymentStatus === deploymentStatusEnum.none &&
              <Typography>
                Vi klarte ikke å gjennomføre din deploy av versjon {deployHistory[0].tagName} kl.
                {moment(new Date(deployHistory[0].build.finished)).format('HH:mm')} til {envName}-miljøet.
                For mer informasjon se {returnBuildLogLink('byggloggen', deployHistory[0].build.id)}.
              </Typography>
            }
          </Grid>
        </Grid>
      }
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
          Huff da, vi opplever en teknisk feil og klarer derfor ikke å tilgjengeliggjøre deploy.
          Vennligst prøv igjen senere. Dersom problemet vedvarer, kontakt Altinn servicedesk LINK TODO
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
                {envName.toUpperCase()}-miljøet
              </Typography>
            </Grid>
            <Grid item={true} className={classes.gridItem} xs={3}>
              {deploymentList && deploymentList.getStatus.success === true &&
                appDeployedVersion !== undefined &&
                  <>
                    Ute i miljøet: version {appDeployedVersion}
                  </>
              }
              {deploymentList && deploymentList.getStatus.success === true &&
                appDeployedVersion === undefined &&
                  <>
                    Ingen app er ute i miljøet
                  </>
              }
              {deploymentList && deploymentList.getStatus.success === false &&
                  <>
                    Ute i miljøet: Midlertidig utilgjengelig
                  </>
              }
            </Grid>
            <Grid item={true} className={classes.gridItem} xs={6}>
              <AltinnLink
                classes={{}}
                url={urlToApp}
                linkTxt={urlToAppLinkTxt}
                shouldShowIcon={false}
              />
            </Grid>
          </Grid>

          <Grid item={true} xs={7} lg={5} className={classNames(classes.dropdownGrid)}>
            {deploymentList && deploymentList.getStatus.success === true && returnDeployDropDown()}
            {deploymentList && deploymentList.getStatus.success === false && returnDeployUnavailable()}

          </Grid>

          <Grid item={true} className={classes.deploymentListGrid}>
            <Typography>
              Tidligere versjoner deployet til {name}-miløet
            </Typography>
            <div className={classes.tableWrapper}>
              <Table
                stickyHeader={true}
                className={classes.table}
                size='small'
                aria-label={`Liste over versjoner deployet til ${envName}-miljøet`}
              >
                <TableHead>
                  <TableRow className={classes.tableRow}>
                    <TableCell className={classes.colorBlack}>
                      <Typography>
                        Versjon
                      </Typography>
                    </TableCell>
                    <TableCell className={classes.colorBlack}>
                    <Typography>
                        Tilgjengelig i miljøet
                      </Typography>
                    </TableCell>
                    <Hidden mdDown={true}>
                      <TableCell className={classes.colorBlack}>
                        <Typography>
                          Deployet av
                        </Typography>
                      </TableCell>
                    </Hidden>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {succeededDeployHistory.map((deploy: any, index: number) => (
                    <TableRow key={index} className={classes.tableRow}>
                      <TableCell component='th' scope='row'>
                        <Typography>
                          {deploy.tagName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography>
                          {moment(new Date(deploy.build.finished)).format('DD.MM.YY [kl.] HH:mm')}
                        </Typography>
                      </TableCell>
                      <Hidden mdDown={true}>
                        <TableCell>
                          <Typography>
                            {deploy.createdBy}
                          </Typography>
                        </TableCell>
                      </Hidden>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Grid>

        </Grid>
    </>
  );
};

export default AppDeploymentComponent;
