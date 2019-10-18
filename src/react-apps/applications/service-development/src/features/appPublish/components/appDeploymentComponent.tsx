// import { useEffect, useState } from 'react';
import { createMuiTheme, createStyles, Grid, Typography, Theme } from '@material-ui/core';

import { makeStyles } from '@material-ui/core/styles';

import * as React from 'react';

import { AltinnLink } from '../../../../../shared/src/components/AltinnLink';
import altinnTheme from '../../../../../shared/src/theme/altinnStudioTheme';

import Select from 'react-select';
import { AltinnButton } from '../../../../../shared/src/components/AltinnButton';

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

import * as moment from 'moment';
import { getValueByPath } from '../../../../../shared/src/utils/getValueByPath';

import AppDeploymentActions from '../../../sharedResources/appDeployment/appDeploymentDispatcher';
import { AltinnSpinner } from '../../../../../shared/src/components/AltinnSpinner';
import { AltinnIcon } from '../../../../../shared/src/components/AltinnIcon';

export interface IReceiptContainerProps {
  envName: string;
  deploymentList?: any;
  urlToApp?: string;
  urlToAppLinkTxt?: string;
  deployableImages?: any;
  deployHistory?: any;
  releases?: any[];
}

const theme = createMuiTheme(altinnTheme);

const useStyles = makeStyles(() =>
  createStyles({
    headingContainer: {
      borderTop: '2px solid #000000',
      borderBottom: '2px solid #C9C9C9',
      marginTop: '2rem',
      paddingTop: '2rem',
      paddingRight: '5rem',
      paddingBottom: '2rem',
      paddingLeft: '5rem',
      width: '100%',
    },
    dropdownGrid: {
      marginRight: '6rem',
    },
    gridItem: {
      paddingRight: '2rem',
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
      minWidth: 400,
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

  const { deployHistory, deploymentList, envName, releases, urlToApp, urlToAppLinkTxt } = props;

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
    AppDeploymentActions.createAppDeployment(selectedImageTag, envName);
  };

  React.useEffect(() => {
    if (selectedImageTag === null || deployInProgress === true) {
      setDeployButtonDisabled(true);
    } else {
      setDeployButtonDisabled(false);
    }
  }, [selectedImageTag, deployInProgress]);

  React.useEffect(() => {
    // console.log('deployHistory', deployHistory && deployHistory[0] && deployHistory[0].build.finished);
    // console.log('valueByPath', envName, getValueByPath(deployHistory[0], 'build.finished', undefined));
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
      now < deployCreatedPlusOneHour ? console.log(`${envName} should SHOW status`) :
        console.log(`${envName} should HIDE status`);
    }

  }, [deployHistory]);

  React.useEffect(() => {
    if (deployInProgress) {

    }
  }, [deployInProgress]);

  return (
    <>

        <Grid container={true} className={classes.headingContainer}>
          <Grid item={true} className={classes.gridEnvTitle} xs={3}>
            <Typography className={classes.envTitle}>
              {envName.toUpperCase()}-miljøet
            </Typography>
          </Grid>
          <Grid item={true} className={classes.gridItem} xs={5}>
            {deploymentList.getStatus.success === true &&
              appDeployedVersion !== undefined &&
                <>
                  Tilgjengelig: v{appDeployedVersion.substring(0, 3)}
                </>
            }
            {deploymentList.getStatus.success === true &&
              appDeployedVersion === undefined &&
                <>
                  Ingen app er tilgjengelig
                </>
            }
            {deploymentList.getStatus.success === false &&
                <>
                  Miljø er utilgjengelig
                </>
            }
          </Grid>
          <Grid item={true} className={classes.gridItem} xs={4}>
            <AltinnLink
              classes={{}}
              url={urlToApp}
              linkTxt={urlToAppLinkTxt}
              shouldShowIcon={false}
            />
          </Grid>

          <Grid item={true} xs={4} className={classes.dropdownGrid}>
            <Typography>
              Velg ønsket versjon for deploy
            </Typography>
            <Select
              className='basic-single'
              classNamePrefix='select'
              isClearable={true}
              isSearchable={true}
              name='color'
              options={releases}
              onChange={doSetSelectedImageTag}
            />
            <div className={classes.deployButton}>
              <AltinnButton
                btnText='Deploy ny versjon'
                disabled={deployButtonDisabled}
                onClickFunction={startDeploy}
              />
            </div>
            {shouldDisplayDeployStatus &&
              <Grid container={true} className={classes.deployStatusGridContainer} alignItems='center'>
                <Grid item={true} className={classes.deploySpinnerGridItem}>
                  {deploymentStatus === deploymentStatusEnum.inProgress &&
                    <AltinnSpinner
                      classes={{}}
                    />
                  }
                  {deploymentStatus === deploymentStatusEnum.succeeded &&
                    <AltinnIcon
                      iconClass='ai ai-check-circle'
                      iconColor={theme.altinnPalette.primary.green}
                      iconSize='3.6rem'
                    />
                  }
                  {(deploymentStatus === deploymentStatusEnum.succeeded ||
                    deploymentStatus === deploymentStatusEnum.partiallySucceeded ||
                    deploymentStatus === deploymentStatusEnum.none) &&
                    <AltinnIcon
                      iconClass='ai ai-info-circle'
                      iconColor={theme.altinnPalette.primary.blueMedium}
                      iconSize='3.6rem'
                    />
                  }
                  {(deploymentStatus === deploymentStatusEnum.succeeded ||
                    deploymentStatus === deploymentStatusEnum.canceled ||
                    deploymentStatus === deploymentStatusEnum.failed) &&
                    <AltinnIcon
                      iconClass='ai ai-circle-exclamation'
                      iconColor={theme.altinnPalette.primary.red}
                      iconSize='3.6rem'
                    />
                  }
                </Grid>
                <Grid item={true}>
                  {deploymentStatus === deploymentStatusEnum.inProgress &&
                    <Typography>
                      {deployHistory[0].createdBy} deployer versjon {deployHistory[0].tagName}
                    </Typography>
                  }
                  {deploymentStatus === deploymentStatusEnum.succeeded &&
                    <Typography>
                      Deploy success!!
                    </Typography>
                  }
                </Grid>
              </Grid>
             }

          </Grid>

          <Grid item={true}>
            <Typography>
              Tidligere versjoner deployet til {name}-miløet
            </Typography>
          <div className={classes.tableWrapper}>
            <Table stickyHeader={true} className={classes.table} size='small' aria-label='TABELL TODO'>
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
                  <TableCell className={classes.colorBlack}>
                    <Typography>
                      Deployet av
                    </Typography>
                  </TableCell>
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
                        {moment(new Date(deploy.build.finished)).format('DD.MM.YY [kl.] hh:mm')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography>
                        {deploy.createdBy}
                      </Typography>
                    </TableCell>
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
