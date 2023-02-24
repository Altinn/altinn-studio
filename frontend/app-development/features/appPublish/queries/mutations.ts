import { post } from 'app-shared/utils/networking';
import { releasesPath, deploymentsPath } from 'app-shared/api-paths';

// http://studio.localhost/designer/api/ttd/autodeploy-v3/releases
export const createRelease = (org, app, payload) => post(releasesPath(org, app), payload);

export const createDeployment = (org, app, payload) => post(deploymentsPath(org, app), payload);
