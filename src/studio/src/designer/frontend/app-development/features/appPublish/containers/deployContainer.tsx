/* eslint-disable react/jsx-max-props-per-line */
import { createMuiTheme, createStyles, Grid, WithStyles, withStyles } from '@material-ui/core';
import * as moment from 'moment';
import * as React from 'react';
import { useSelector } from 'react-redux';
import AltinnContentLoader from 'app-shared/components/molecules/AltinnContentLoader';
import StudioTheme from 'app-shared/theme/altinnStudioTheme';
import AppClusterActions from '../../../sharedResources/appCluster/appClusterDispatcher';
import { IAppClusterState } from '../../../sharedResources/appCluster/appClusterReducer';
import AppDeploymentActions from '../../../sharedResources/appDeployment/appDeploymentDispatcher';
import { IAppDeploymentState, ICreateAppDeploymentErrors } from '../../../sharedResources/appDeployment/appDeploymentReducer';
import { IAppReleaseState } from '../../../sharedResources/appRelease/appReleaseReducer';
import { BuildResult } from '../../../sharedResources/appRelease/types';
import ConfigurationActions from '../../../sharedResources/configuration/configurationDispatcher';
import { IConfigurationState } from '../../../sharedResources/configuration/configurationReducer';
import AppDeploymentComponent from '../components/appDeploymentComponent';

const theme = createMuiTheme(StudioTheme);

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

export interface IDeployContainer extends WithStyles<typeof styles> {

}

export const DeployContainer = (props: IDeployContainer) => {
  const { org, app } = window as Window as IAltinnWindow;
  const { classes } = props;

  const [environments, setEnvironments] = React.useState([]);
  const [imageOptions, setImageOptions] = React.useState([]);

  const appCluster: IAppClusterState = useSelector((state: IServiceDevelopmentState) => state.appCluster);
  const appDeployments: IAppDeploymentState = useSelector((state: IServiceDevelopmentState) => state.appDeployments);
  // eslint-disable-next-line max-len
  const createAppDeploymentErrors: any = useSelector((state: IServiceDevelopmentState) => state.appDeployments.createAppDeploymentErrors);
  const deployableImages: IAppReleaseState = useSelector((state: IServiceDevelopmentState) => state.appReleases);
  const configuration: IConfigurationState = useSelector((state: IServiceDevelopmentState) => state.configuration);
  const language: any = useSelector((state: IServiceDevelopmentState) => state.language);
  const orgs: any = useSelector((state: IServiceDevelopmentState) => state.configuration.orgs);

  React.useEffect(() => {
    ConfigurationActions.getEnvironments();
    AppDeploymentActions.getAppDeploymentsStartInterval();

    return () => {
      AppDeploymentActions.getAppDeploymentsStopInterval();
      AppClusterActions.getDeploymentsStopInterval();
    };
  }, []);

  React.useEffect(() => {
    if (
      !!orgs.allOrgs &&
      !!orgs.allOrgs[org] &&
      !!orgs.allOrgs[org].environments &&
      !!configuration.environments.result
    ) {
      setEnvironments(orgs.allOrgs[org].environments.map(
        (envName: string) => configuration.environments.result.find((env: any) => env.name === envName),
      ).filter((element: any) => element != null));
    }
  }, [orgs, configuration]);

  React.useEffect(() => {
    if (environments.length) {
      AppClusterActions.getDeploymentsStartInterval();
    } else {
      AppClusterActions.getDeploymentsStopInterval();
    }
  }, [environments, appDeployments]);

  React.useEffect(() => {
    const tempImages = deployableImages.releases
      .filter((image) => image.build.result === BuildResult.succeeded)
      .map((image) => {
        const releaseTime = moment(new Date(image.created)).format('DD.MM.YY [kl.] HH:mm');
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
        <AltinnContentLoader width={900} height={320}>
          <rect x='60' y='13' rx='0' ry='0' width='650' height='76' />
          <rect x='60' y='110' rx='0' ry='0' width='333' height='44' />
          <rect x='60' y='171' rx='0' ry='0' width='202' height='41' />
          <rect x='487' y='111' rx='0' ry='0' width='220' height='42' />
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
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            envName={env.name}
            envObj={env}
            urlToApp={`https://${org}.${env.appPrefix}.${env.hostname}/${org}/${app}/`}
            urlToAppLinkTxt={`${org}.${env.appPrefix}.${env.hostname}/${org}/${app}/`}
            deploymentList={
              appCluster.deploymentList &&
              appCluster.deploymentList.find((elem: any) => elem.env === env.name)
            }
            releases={imageOptions}
            deployHistory={appDeployments.deployments.filter((deployment: any) => deployment.envName === env.name)}
            deployError={createAppDeploymentErrors.filter(
              (error: ICreateAppDeploymentErrors) => error.env === env.name,
            )}
            language={language}
          />
        );
      })}
    </Grid>
  );
};

export default withStyles(styles)(DeployContainer);
