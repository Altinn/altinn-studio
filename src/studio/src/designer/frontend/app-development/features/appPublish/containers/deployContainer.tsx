import React from 'react';
import { createTheme, Grid } from '@mui/material';
import { createStyles, WithStyles, withStyles } from '@mui/styles';
import moment from 'moment';

import AltinnContentLoader from 'app-shared/components/molecules/AltinnContentLoader';
import StudioTheme from 'app-shared/theme/altinnStudioTheme';
import type { IAppClusterState } from '../../../sharedResources/appCluster/appClusterSlice';
import {
  getDeploymentsStartInterval,
  getDeploymentsStopInterval,
} from '../../../sharedResources/appCluster/appClusterSlice';
import type { IAppDeploymentState } from '../../../sharedResources/appDeployment/appDeploymentSlice';
import { AppDeploymentActions } from '../../../sharedResources/appDeployment/appDeploymentSlice';
import type { ICreateAppDeploymentErrors } from '../../../sharedResources/appDeployment/types';
import type { IAppReleaseState } from '../../../sharedResources/appRelease/appReleaseSlice';
import { BuildResult } from '../../../sharedResources/appRelease/types';
import type { IConfigurationState } from '../../../sharedResources/configuration/configurationSlice';
import { ConfigurationActions } from '../../../sharedResources/configuration/configurationSlice';
import AppDeploymentComponent from '../components/appDeploymentComponent';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../common/hooks';

const theme = createTheme(StudioTheme);

const styles = createStyles({
  deployContainer: {
    overflow: 'scroll',
    [theme.breakpoints.up('xs')]: {
      height: 'calc(100vh - 55px)',
    },
    [theme.breakpoints.up('md')]: {
      height: 'calc(100vh - 111px)',
    },
  },
});

type IDeployContainer = WithStyles<typeof styles>;

export const DeployContainer = (props: IDeployContainer) => {
  const { org, app } = useParams();
  const { classes } = props;
  const dispatch = useAppDispatch();

  const [environments, setEnvironments] = React.useState([]);
  const [imageOptions, setImageOptions] = React.useState([]);

  const appCluster: IAppClusterState = useAppSelector(
    (state) => state.appCluster,
  );
  const appDeployments: IAppDeploymentState = useAppSelector(
    (state) => state.appDeployments,
  );
  const createAppDeploymentErrors: any = useAppSelector(
    (state) => state.appDeployments.createAppDeploymentErrors,
  );
  const deployableImages: IAppReleaseState = useAppSelector(
    (state) => state.appReleases,
  );
  const configuration: IConfigurationState = useAppSelector(
    (state) => state.configuration,
  );
  const language: any = useAppSelector((state) => state.languageState.language);
  const orgs: any = useAppSelector((state) => state.configuration.orgs);
  const deployPermissions: string[] = useAppSelector(
    (state) => state.userState.permissions.deploy.environments,
  );
  const orgName: string = useAppSelector((state) => {
    let name = '';
    if (
      state.configuration.orgs.allOrgs &&
      state.configuration.orgs.allOrgs[org]
    ) {
      name = state.configuration.orgs.allOrgs[org].name.nb;
    }
    return name;
  });

  React.useEffect(() => {
    dispatch(ConfigurationActions.getEnvironments());
    dispatch(AppDeploymentActions.getAppDeploymentsStartInterval());

    return () => {
      dispatch(AppDeploymentActions.getAppDeploymentsStopInterval());
      dispatch(getDeploymentsStopInterval());
    };
  }, []);

  React.useEffect(() => {
    if (
      !!orgs.allOrgs &&
      !!orgs.allOrgs[org] &&
      !!orgs.allOrgs[org].environments &&
      !!configuration.environments.result
    ) {
      setEnvironments(
        orgs.allOrgs[org].environments
          .map((envName: string) =>
            configuration.environments.result.find(
              (env: any) => env.name === envName,
            ),
          )
          .filter((element: any) => element != null),
      );
    }
  }, [orgs, org, configuration]);

  React.useEffect(() => {
    if (environments.length) {
      dispatch(getDeploymentsStartInterval());
    } else {
      dispatch(getDeploymentsStopInterval());
    }
  }, [environments, dispatch, appDeployments]);

  React.useEffect(() => {
    const tempImages = deployableImages.releases
      .filter((image) => image.build.result === BuildResult.succeeded)
      .map((image) => {
        const releaseTime = moment(new Date(image.created)).format(
          'DD.MM.YY [kl.] HH:mm',
        );
        return {
          value: image.tagName,
          label: `Version ${image.tagName} (${releaseTime})`,
        };
      });
    setImageOptions(tempImages);
  }, [deployableImages]);

  const isLoading = (): boolean => {
    return (
      !environments.length ||
      !appDeployments.deployments ||
      !deployableImages ||
      !language
    );
  };

  if (isLoading()) {
    return (
      <Grid
        container={true}
        direction='row'
        className={classes.deployContainer}
      >
        <AltinnContentLoader
          width={900}
          height={320}
        >
          <rect
            x='60'
            y='13'
            rx='0'
            ry='0'
            width='650'
            height='76'
          />
          <rect
            x='60'
            y='110'
            rx='0'
            ry='0'
            width='333'
            height='44'
          />
          <rect
            x='60'
            y='171'
            rx='0'
            ry='0'
            width='202'
            height='41'
          />
          <rect
            x='487'
            y='111'
            rx='0'
            ry='0'
            width='220'
            height='42'
          />
        </AltinnContentLoader>
      </Grid>
    );
  }

  return (
    <Grid
      container={true}
      direction='row'
      className={classes.deployContainer}
    >
      {environments.map((env: any, index: number) => {
        return (
          <AppDeploymentComponent
            key={index}
            envName={env.name}
            envObj={env}
            urlToApp={`https://${org}.${env.appPrefix}.${env.hostname}/${org}/${app}/`}
            urlToAppLinkTxt={`${org}.${env.appPrefix}.${env.hostname}/${org}/${app}/`}
            deploymentList={
              appCluster.deploymentList &&
              appCluster.deploymentList.find(
                (elem: any) => elem.env === env.name,
              )
            }
            releases={imageOptions}
            deployHistory={appDeployments.deployments.filter(
              (deployment: any) => deployment.envName === env.name,
            )}
            deployError={createAppDeploymentErrors.filter(
              (error: ICreateAppDeploymentErrors) => error.env === env.name,
            )}
            language={language}
            deployPermission={
              deployPermissions.findIndex(
                (e) => e.toLowerCase() === env.name.toLowerCase(),
              ) > -1
            }
            orgName={orgName}
          />
        );
      })}
    </Grid>
  );
};

export default withStyles(styles)(DeployContainer);
