import { post } from 'app-shared/utils/networking';
import { releasesPath, deploymentsPath } from 'app-shared/api-paths';

export const createRelease = (org, app, payload) => post(releasesPath(org, app), payload);

export const createDeployment = (org, app, payload) => post(deploymentsPath(org, app), payload);
