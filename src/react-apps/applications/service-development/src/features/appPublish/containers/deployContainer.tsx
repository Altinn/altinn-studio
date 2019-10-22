import * as moment from 'moment';
import * as React from 'react';
import { useSelector } from 'react-redux';
import AltinnContentLoader from '../../../../../shared/src/components/molecules/AltinnContentLoader';
import AppClusterActions from '../../../sharedResources/appCluster/appClusterDispatcher';
import { IAppClusterState } from '../../../sharedResources/appCluster/appClusterReducer';
import AppDeploymentActions from '../../../sharedResources/appDeployment/appDeploymentDispatcher';
import { IAppDeploymentState, ICreateAppDeploymentErrors } from '../../../sharedResources/appDeployment/appDeploymentReducer';
import { IAppReleaseState } from '../../../sharedResources/appRelease/appReleaseReducer';
import ConfigurationActions from '../../../sharedResources/configuration/configurationDispatcher';
import { IConfigurationState } from '../../../sharedResources/configuration/configurationReducer';
import AppDeploymentComponent from '../components/appDeploymentComponent';

export interface IDeployContainer {

}

const DeployContainer = (props: IDeployContainer) => {
  const { org, app } = window as Window as IAltinnWindow;

  const [environments, setEnvironments] = React.useState([]);
  const [imageOptions, setImageOptions] = React.useState([]);

  const appCluster: IAppClusterState = useSelector((state: IServiceDevelopmentState) => state.appCluster);
  const appDeployments: IAppDeploymentState = useSelector((state: IServiceDevelopmentState) => state.appDeployments);
  const createAppDeploymentErrors: any = useSelector((state: IServiceDevelopmentState) =>
    state.appDeployments.createAppDeploymentErrors);
  const deployableImages: IAppReleaseState = useSelector((state: IServiceDevelopmentState) => state.appReleases);
  const configuration: IConfigurationState = useSelector((state: IServiceDevelopmentState) =>
    state.configuration);

  React.useEffect(() => {
    ConfigurationActions.getEnvironments();
    AppDeploymentActions.getAppDeploymentsStartInterval();

    return () => {
      AppDeploymentActions.getAppDeploymentsStopInterval();
    };

  }, []);

  React.useEffect(() => {
    if (configuration.environments && configuration.environments.result) {
      setEnvironments(configuration.environments.result);
    }
  }, [configuration]);

  React.useEffect(() => {
    environments.map((env: any) => {
      AppClusterActions.getDeploymentsStartInterval();
    });
  }, [environments, appDeployments]);

  React.useEffect(() => {
    const tempImages = deployableImages.releases.map((image) => {
      const releaseTime = moment.utc(new Date(image.created)).format('DD.MM.YY [kl.] hh:mm');

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
      !deployableImages
    );
  };

  return (
    <>
      {isLoading() &&
        <AltinnContentLoader  width={705} height={561} />
      }
      {!isLoading() &&
        environments.map((env: any, index: number) => {
          return(
            <AppDeploymentComponent
              key={index}
              envName={env.name}
              envObj={env}
              urlToApp={`https://${org}.${env.name}.${env.hostname}/${org}/${app}`}
              urlToAppLinkTxt={`${org}.${env.name}.${env.hostname}/${org}/${app}`}
              deploymentList={
                appCluster.deploymentList &&
                appCluster.deploymentList.find((elem: any) => elem.env === env.name)
              }
              releases={imageOptions}
              deployHistory={appDeployments.deployments.filter((deployment: any) => deployment.envName === env.name)}
              deployError={createAppDeploymentErrors.filter(
                              (error: ICreateAppDeploymentErrors) => error.env === env.name)}
            />
          );
        })
      }
    </>
  );
};

export default DeployContainer;
