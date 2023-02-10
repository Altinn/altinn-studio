import { post } from 'app-shared/utils/networking';
import { appReleasesPath, appDeploymentsPath } from 'app-shared/api-paths';

// http://studio.localhost/designer/api/ttd/autodeploy-v3/releases
export const createRelease = (org, app, payload) => post(appReleasesPath(org, app), payload);

export const createDeployment = (org, app, payload) => post(appDeploymentsPath(org, app), payload);
