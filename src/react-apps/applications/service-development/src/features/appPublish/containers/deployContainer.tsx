import * as React from 'react';
import { useSelector } from 'react-redux';
import AppDeploymentActions from '../../../sharedResources/appDeployment/appDeploymentDispatcher';
import { IAppDeploymentState } from '../../../sharedResources/appDeployment/appDeploymentReducer';
import { IDeployment } from '../../../sharedResources/appDeployment/types';

export default function() {
  const appDeployments: IAppDeploymentState = useSelector((state: IServiceDevelopmentState) => state.appDeployments);

  React.useEffect(() => {
    AppDeploymentActions.getAppDeployments();
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
