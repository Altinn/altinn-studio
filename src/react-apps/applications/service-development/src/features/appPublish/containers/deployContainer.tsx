import * as React from 'react';
import { useSelector } from 'react-redux';
import AppDeploymentActions from '../../../sharedResources/appDeploy/appDeployDispatcher';
import { IAppDeploymentState } from '../../../sharedResources/appDeploy/appDeployReducer';
import { IDeployment } from '../../../sharedResources/appDeploy/types';

export default function() {
  const appDeployments: IAppDeploymentState = useSelector((state: IServiceDevelopmentState) => state.appDeployments);

  React.useEffect(() => {
    AppDeploymentActions.getDeployments();
  }, []);

  if (!appDeployments.deployments || !appDeployments.deployments.length) {
    return null;
  }
  return (
    <>
      {appDeployments.deployments.map((deployment: IDeployment, index: number) => (
        <h1 key={index}>{deployment.tag_name}</h1>
      ))}
    </>
  );
}
